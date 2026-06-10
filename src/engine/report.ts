import { bestAsk, bestBid } from './exchange';
import type { AgentKind, AgentState, WorldState } from './types';

/** gp + buy-order escrow + (held + sell-escrowed) inventory valued at last price. */
export function netWorth(state: WorldState, agent: AgentState): number {
  let total = agent.gp;
  for (const def of state.items) {
    const book = state.books[def.id];
    if (!book) continue;
    total += (agent.inventory[def.id] ?? 0) * book.lastPrice;
    for (const o of book.buys) if (o.agentId === agent.id) total += o.escrowGp;
    for (const o of book.sells) if (o.agentId === agent.id) total += o.remaining * book.lastPrice;
  }
  return total;
}

export function wealthByKind(state: WorldState): Partial<Record<AgentKind, number>> {
  const out: Partial<Record<AgentKind, number>> = {};
  for (const a of state.agents) out[a.kind] = (out[a.kind] ?? 0) + netWorth(state, a);
  return out;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function pad(v: string | number, w: number): string {
  return String(v).padStart(w);
}

export function renderReport(state: WorldState): string {
  const lines: string[] = [];
  lines.push(`=== Exchange Wars — tick ${fmt(state.tick)} · seed ${state.seed} ===`);
  lines.push('item              last      ema      bid      ask      vol   anchor');
  for (const def of state.items) {
    const b = state.books[def.id];
    if (!b) continue;
    const bid = bestBid(b);
    const ask = bestAsk(b);
    lines.push(
      def.id.padEnd(14) +
        pad(b.lastPrice, 9) +
        pad(Math.round(b.ema), 9) +
        pad(bid ? bid.price : '-', 9) +
        pad(ask ? ask.price : '-', 9) +
        pad(b.volume, 9) +
        `   [${def.baseCost}..${def.consumeValue}]`,
    );
  }
  const wealth = wealthByKind(state);
  const kinds = Object.keys(wealth).sort() as AgentKind[];
  lines.push('wealth: ' + kinds.map((k) => `${k} ${fmt(wealth[k] ?? 0)}`).join(' · '));
  for (const a of state.agents) {
    if (a.kind !== 'player') continue;
    const nw = netWorth(state, a);
    const start = a.memo['startGp'] ?? 0;
    const delta = nw - start;
    lines.push(`player #${a.id}: net worth ${fmt(nw)} gp (start ${fmt(start)}, ${delta >= 0 ? '+' : ''}${fmt(delta)})`);
  }
  const l = state.ledger;
  lines.push(
    `ledger gp: initial ${fmt(l.gpInitial)} + minted ${fmt(l.gpMinted)} - burned ${fmt(l.gpBurned)} = ${fmt(l.gpInitial + l.gpMinted - l.gpBurned)}`,
  );
  const s = state.stats;
  lines.push(
    `orders: ${fmt(s.ordersPlaced)} placed · ${fmt(s.ordersRejected)} rejected · ${fmt(s.ordersCancelled)} cancelled · ${fmt(s.tradesTotal)} trades`,
  );
  return lines.join('\n');
}
