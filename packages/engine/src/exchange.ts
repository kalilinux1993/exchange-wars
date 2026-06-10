import type { AgentState, ItemId, Order, OrderBook, Side, Trade, WorldState } from './types';

/** GE-style tax on seller proceeds — the economy's primary gp sink. */
export const GE_TAX_RATE = 0.02;
const EMA_ALPHA = 0.05;
const TRADE_WINDOW = 512;

export function createBook(itemId: ItemId, initialPrice: number): OrderBook {
  return { itemId, buys: [], sells: [], lastPrice: initialPrice, ema: initialPrice, volume: 0 };
}

export function bestBid(book: OrderBook): Order | undefined {
  return book.buys[0];
}

export function bestAsk(book: OrderBook): Order | undefined {
  return book.sells[0];
}

export interface PlaceResult {
  accepted: boolean;
  reason?: string;
  trades: Trade[];
}

function buyBefore(a: Order, b: Order): boolean {
  if (a.price !== b.price) return a.price > b.price;
  if (a.tick !== b.tick) return a.tick < b.tick;
  return a.id < b.id;
}

function sellBefore(a: Order, b: Order): boolean {
  if (a.price !== b.price) return a.price < b.price;
  if (a.tick !== b.tick) return a.tick < b.tick;
  return a.id < b.id;
}

function insertSorted(arr: Order[], order: Order, before: (a: Order, b: Order) => boolean): void {
  let i = 0;
  while (i < arr.length && !before(order, arr[i] as Order)) i++;
  arr.splice(i, 0, order);
}

function agentById(state: WorldState, id: number): AgentState {
  // Agents are append-only, so id doubles as array index — assert the coupling.
  const a = state.agents[id];
  if (!a || a.id !== id) throw new Error(`agent id/index mismatch for ${id}`);
  return a;
}

function recordTrade(
  state: WorldState,
  book: OrderBook,
  price: number,
  qty: number,
  buyerId: number,
  sellerId: number,
): Trade {
  book.lastPrice = price;
  book.ema = book.ema + EMA_ALPHA * (price - book.ema);
  book.volume += qty;
  const trade: Trade = { tick: state.tick, itemId: book.itemId, price, qty, buyerId, sellerId };
  state.trades.push(trade);
  if (state.trades.length > TRADE_WINDOW) state.trades.shift();
  state.stats.tradesTotal++;
  return trade;
}

function paySeller(state: WorldState, seller: AgentState, proceeds: number): void {
  const tax = Math.floor(proceeds * GE_TAX_RATE);
  seller.gp += proceeds - tax;
  state.ledger.gpBurned += tax;
}

function rejected(state: WorldState, reason: string): PlaceResult {
  state.stats.ordersRejected++;
  return { accepted: false, reason, trades: [] };
}

/**
 * Place a limit order. Fills immediately against the opposing side where
 * possible (trade price = resting order's price), rests the remainder.
 * Buy remainders escrow gp at the limit price; sell quantity escrows items
 * up front. Self-trades are skipped, never matched.
 */
export function placeOrder(
  state: WorldState,
  agent: AgentState,
  itemId: ItemId,
  side: Side,
  price: number,
  qty: number,
): PlaceResult {
  const book = state.books[itemId];
  if (!book) return rejected(state, 'unknown-item');
  if (!Number.isInteger(price) || price < 1) return rejected(state, 'bad-price');
  if (!Number.isInteger(qty) || qty < 1) return rejected(state, 'bad-qty');
  if (side === 'buy' && agent.gp < price * qty) return rejected(state, 'insufficient-gp');
  if (side === 'sell' && (agent.inventory[itemId] ?? 0) < qty) return rejected(state, 'insufficient-items');

  state.stats.ordersPlaced++;
  const order: Order = {
    id: state.nextOrderId++,
    tick: state.tick,
    agentId: agent.id,
    itemId,
    side,
    price,
    qty,
    remaining: qty,
    escrowGp: 0,
  };
  const trades: Trade[] = [];

  if (side === 'buy') {
    let i = 0;
    while (order.remaining > 0 && i < book.sells.length) {
      const ask = book.sells[i] as Order;
      if (ask.price > price) break;
      if (ask.agentId === agent.id) {
        i++;
        continue;
      }
      const q = Math.min(order.remaining, ask.remaining);
      const tradePrice = ask.price;
      agent.gp -= tradePrice * q;
      agent.inventory[itemId] = (agent.inventory[itemId] ?? 0) + q;
      paySeller(state, agentById(state, ask.agentId), tradePrice * q);
      ask.remaining -= q;
      order.remaining -= q;
      trades.push(recordTrade(state, book, tradePrice, q, agent.id, ask.agentId));
      if (ask.remaining === 0) book.sells.splice(i, 1);
    }
    if (order.remaining > 0) {
      order.escrowGp = price * order.remaining;
      agent.gp -= order.escrowGp;
      insertSorted(book.buys, order, buyBefore);
    }
  } else {
    agent.inventory[itemId] = (agent.inventory[itemId] ?? 0) - qty;
    let i = 0;
    while (order.remaining > 0 && i < book.buys.length) {
      const bid = book.buys[i] as Order;
      if (bid.price < price) break;
      if (bid.agentId === agent.id) {
        i++;
        continue;
      }
      const q = Math.min(order.remaining, bid.remaining);
      const tradePrice = bid.price;
      bid.escrowGp -= tradePrice * q;
      const buyer = agentById(state, bid.agentId);
      buyer.inventory[itemId] = (buyer.inventory[itemId] ?? 0) + q;
      paySeller(state, agent, tradePrice * q);
      bid.remaining -= q;
      order.remaining -= q;
      trades.push(recordTrade(state, book, tradePrice, q, bid.agentId, agent.id));
      if (bid.remaining === 0) book.buys.splice(i, 1);
    }
    if (order.remaining > 0) {
      insertSorted(book.sells, order, sellBefore);
    }
  }
  return { accepted: true, trades };
}

/**
 * Cancel an agent's resting orders, refunding gp escrow / escrowed items.
 * Optional filters: a single item, a single side. Returns count cancelled.
 */
export function cancelAgentOrders(
  state: WorldState,
  agent: AgentState,
  itemId?: ItemId,
  side?: Side,
): number {
  let n = 0;
  for (const def of state.items) {
    if (itemId !== undefined && def.id !== itemId) continue;
    const book = state.books[def.id];
    if (!book) continue;
    if (side === undefined || side === 'buy') {
      n += cancelFromSide(book.buys, agent, (o) => {
        agent.gp += o.escrowGp;
        o.escrowGp = 0;
      });
    }
    if (side === undefined || side === 'sell') {
      n += cancelFromSide(book.sells, agent, (o) => {
        agent.inventory[o.itemId] = (agent.inventory[o.itemId] ?? 0) + o.remaining;
      });
    }
  }
  state.stats.ordersCancelled += n;
  return n;
}

function cancelFromSide(sideArr: Order[], agent: AgentState, refund: (o: Order) => void): number {
  let n = 0;
  for (let i = sideArr.length - 1; i >= 0; i--) {
    const o = sideArr[i] as Order;
    if (o.agentId !== agent.id) continue;
    refund(o);
    sideArr.splice(i, 1);
    n++;
  }
  return n;
}
