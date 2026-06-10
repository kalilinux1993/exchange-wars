import { bestAsk, bestBid, cancelAgentOrders, GE_TAX_RATE, placeOrder } from './exchange';
import type { RNG } from './rng';
import type { AgentKind, AgentState, ItemDef, ItemId, WorldState } from './types';

// All balance numbers live here so tuning passes touch one object.
export const TUNING = {
  producer: { cadence: 6, batch: 2, inventoryCap: 80, glutThreshold: 50, margin: 1.05 },
  consumer: { cadence: 5, wageFactor: 0.75, buffer: 3 },
  marketMaker: { cadence: 8, spreadPct: 0.06, quoteQty: 4 },
  momentum: { cadence: 7, band: 0.02 },
  noise: { cadence: 4, cancelChance: 0.15 },
  player: { cadence: 5, maxQty: 8, capitalFraction: 0.25, minProfit: 2, minMarginPct: 0.03 },
} as const;

const CADENCE: Record<AgentKind, number> = {
  producer: TUNING.producer.cadence,
  consumer: TUNING.consumer.cadence,
  marketMaker: TUNING.marketMaker.cadence,
  momentum: TUNING.momentum.cadence,
  noise: TUNING.noise.cadence,
  player: TUNING.player.cadence,
};

export function actAgent(state: WorldState, agent: AgentState, rng: RNG): void {
  if ((state.tick + agent.id) % CADENCE[agent.kind] !== 0) return;
  switch (agent.kind) {
    case 'producer':
      return actProducer(state, agent);
    case 'consumer':
      return actConsumer(state, agent);
    case 'marketMaker':
      return actMarketMaker(state, agent);
    case 'momentum':
      return actMomentum(state, agent, rng);
    case 'noise':
      return actNoise(state, agent, rng);
    case 'player':
      return actPlayer(state, agent);
  }
}

function defFor(state: WorldState, itemId: ItemId | undefined): ItemDef {
  const def = state.items.find((i) => i.id === itemId);
  if (!def) throw new Error(`agent specialised in unknown item ${itemId}`);
  return def;
}

/** Mints items at cost-anchored rate; sells at or above cost — the price floor. */
function actProducer(state: WorldState, agent: AgentState): void {
  const def = defFor(state, agent.itemId);
  const book = state.books[def.id];
  if (!book) return;
  const held = agent.inventory[def.id] ?? 0;
  const make = Math.min(TUNING.producer.batch, Math.max(0, TUNING.producer.inventoryCap - held));
  if (make > 0) {
    agent.inventory[def.id] = held + make;
    state.ledger.itemsMinted[def.id] = (state.ledger.itemsMinted[def.id] ?? 0) + make;
  }
  cancelAgentOrders(state, agent, def.id);
  const stock = agent.inventory[def.id] ?? 0;
  if (stock < 1) return;
  const floor = Math.max(1, Math.round(def.baseCost * TUNING.producer.margin));
  const ask = bestAsk(book);
  let price: number;
  if (stock > TUNING.producer.glutThreshold) {
    price = floor; // glut: dump at cost to clear
  } else if (ask) {
    price = Math.max(floor, ask.price - 1); // undercut, never below cost
  } else {
    price = Math.max(floor, Math.round(book.lastPrice * 1.02));
  }
  placeOrder(state, agent, def.id, 'sell', price, stock);
}

/** Earns a wage (gp faucet), burns items (item sink), bids up to reservation value — the price ceiling. */
function actConsumer(state: WorldState, agent: AgentState): void {
  const def = defFor(state, agent.itemId);
  const book = state.books[def.id];
  if (!book) return;
  const wage = Math.ceil(def.consumeValue * TUNING.consumer.wageFactor);
  agent.gp += wage;
  state.ledger.gpMinted += wage;
  const held = agent.inventory[def.id] ?? 0;
  if (held > 0) {
    agent.inventory[def.id] = held - 1;
    state.ledger.itemsBurned[def.id] = (state.ledger.itemsBurned[def.id] ?? 0) + 1;
  }
  if ((agent.inventory[def.id] ?? 0) >= TUNING.consumer.buffer) return;
  cancelAgentOrders(state, agent, def.id);
  const ask = bestAsk(book);
  const target = ask ? ask.price : Math.round(book.lastPrice);
  const price = Math.max(1, Math.min(def.consumeValue, target));
  const want = TUNING.consumer.buffer - (agent.inventory[def.id] ?? 0);
  const qty = Math.min(want, Math.floor(agent.gp / price));
  if (qty >= 1) placeOrder(state, agent, def.id, 'buy', price, qty);
}

/** Quotes both sides around the EMA — provides the liquidity the flipper trades against. */
function actMarketMaker(state: WorldState, agent: AgentState): void {
  const def = defFor(state, agent.itemId);
  const book = state.books[def.id];
  if (!book) return;
  cancelAgentOrders(state, agent, def.id);
  const mid = Math.max(2, Math.round(book.ema));
  const spread = Math.max(4, Math.round(mid * TUNING.marketMaker.spreadPct));
  const half = Math.floor(spread / 2);
  const bidPrice = Math.max(1, mid - half);
  const askPrice = mid + (spread - half);
  const buyQty = Math.min(TUNING.marketMaker.quoteQty, Math.floor(agent.gp / bidPrice));
  if (buyQty >= 1) placeOrder(state, agent, def.id, 'buy', bidPrice, buyQty);
  const sellQty = Math.min(TUNING.marketMaker.quoteQty, agent.inventory[def.id] ?? 0);
  if (sellQty >= 1) placeOrder(state, agent, def.id, 'sell', askPrice, sellQty);
}

/** Chases trends — buys strength, sells weakness. The boom/bust pressure source. */
function actMomentum(state: WorldState, agent: AgentState, rng: RNG): void {
  if (rng.chance(0.1)) cancelAgentOrders(state, agent);
  const def = rng.pick(state.items);
  const book = state.books[def.id];
  if (!book) return;
  const rising = book.lastPrice > book.ema * (1 + TUNING.momentum.band);
  const falling = book.lastPrice < book.ema * (1 - TUNING.momentum.band);
  if (rising) {
    const ask = bestAsk(book);
    const price = ask ? ask.price : Math.max(1, Math.round(book.lastPrice * 1.03));
    const qty = Math.min(rng.int(1, 2), Math.floor(agent.gp / price));
    if (qty >= 1) placeOrder(state, agent, def.id, 'buy', price, qty);
  } else if (falling) {
    const held = agent.inventory[def.id] ?? 0;
    if (held > 0) {
      const bid = bestBid(book);
      const price = bid ? bid.price : Math.max(1, Math.round(book.lastPrice * 0.97));
      placeOrder(state, agent, def.id, 'sell', price, Math.min(held, rng.int(1, 2)));
    }
  }
}

/** Random walk around last price — keeps books from going sterile. */
function actNoise(state: WorldState, agent: AgentState, rng: RNG): void {
  if (rng.chance(TUNING.noise.cancelChance)) cancelAgentOrders(state, agent);
  const def = rng.pick(state.items);
  const book = state.books[def.id];
  if (!book) return;
  const perturb = 1 + (rng.next() * 2 - 1) * def.volatility;
  const price = Math.max(1, Math.round(book.lastPrice * perturb));
  if (rng.chance(0.5)) {
    const qty = Math.min(rng.int(1, 3), Math.floor(agent.gp / price));
    if (qty >= 1) placeOrder(state, agent, def.id, 'buy', price, qty);
  } else {
    const qty = Math.min(rng.int(1, 3), agent.inventory[def.id] ?? 0);
    if (qty >= 1) placeOrder(state, agent, def.id, 'sell', price, qty);
  }
}

/**
 * The scripted flipper — proves the game is programmatically playable.
 * Classic GE flip: buy at bid+1, sell at ask-1, only when post-tax margin clears.
 */
function actPlayer(state: WorldState, agent: AgentState): void {
  cancelAgentOrders(state, agent, undefined, 'buy');

  for (const def of state.items) {
    const book = state.books[def.id];
    if (!book) continue;
    cancelAgentOrders(state, agent, def.id, 'sell');
    const held = agent.inventory[def.id] ?? 0;
    if (held < 1) continue;
    const ask = bestAsk(book);
    const sellAt = Math.max(1, ask ? ask.price - 1 : Math.round(book.ema * 1.03));
    placeOrder(state, agent, def.id, 'sell', sellAt, held);
  }

  let best: { itemId: ItemId; buyAt: number; profit: number } | null = null;
  for (const def of state.items) {
    const book = state.books[def.id];
    if (!book) continue;
    const bid = bestBid(book);
    const ask = bestAsk(book);
    if (!bid || !ask) continue;
    if (ask.agentId === agent.id) continue; // our own sell is best ask — no flip here
    const buyAt = bid.price + 1;
    const sellAt = ask.price - 1;
    if (sellAt <= buyAt) continue;
    const profit = sellAt - Math.floor(sellAt * GE_TAX_RATE) - buyAt;
    // Skip flips that barely clear tax — thin margins lose to price drift.
    const minProfit = Math.max(TUNING.player.minProfit, Math.ceil(buyAt * TUNING.player.minMarginPct));
    if (profit >= minProfit && (best === null || profit > best.profit)) {
      best = { itemId: def.id, buyAt, profit };
    }
  }
  if (best === null) return;
  const budget = Math.floor(agent.gp * TUNING.player.capitalFraction);
  const qty = Math.min(TUNING.player.maxQty, Math.floor(budget / best.buyAt));
  if (qty >= 1) placeOrder(state, agent, best.itemId, 'buy', best.buyAt, qty);
}
