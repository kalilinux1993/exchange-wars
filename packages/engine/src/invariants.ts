import type { Order, WorldState } from './types';

/**
 * Hard conservation + structural invariants. Throws with a specific message on
 * the first violation. Used by tests and the CLI runner — not in the tick loop.
 */
export function checkInvariants(state: WorldState): void {
  let gpTotal = 0;
  for (const a of state.agents) {
    if (!Number.isSafeInteger(a.gp)) throw new Error(`agent ${a.id} gp not a safe integer: ${a.gp}`);
    if (a.gp < 0) throw new Error(`agent ${a.id} has negative gp: ${a.gp}`);
    gpTotal += a.gp;
  }

  for (const def of state.items) {
    const book = state.books[def.id];
    if (!book) throw new Error(`missing order book for ${def.id}`);
    for (const o of book.buys) {
      if (o.remaining < 1) throw new Error(`buy order ${o.id} resting with remaining ${o.remaining}`);
      if (o.escrowGp !== o.price * o.remaining) {
        throw new Error(`buy order ${o.id} escrow ${o.escrowGp} != price*remaining ${o.price * o.remaining}`);
      }
      gpTotal += o.escrowGp;
    }
    for (const o of book.sells) {
      if (o.remaining < 1) throw new Error(`sell order ${o.id} resting with remaining ${o.remaining}`);
      if (o.escrowGp !== 0) throw new Error(`sell order ${o.id} has gp escrow ${o.escrowGp}`);
    }
    assertSorted(book.buys, -1, `buys[${def.id}]`);
    assertSorted(book.sells, 1, `sells[${def.id}]`);
  }

  // The consumer wage faucet mints gp linearly with tick count; this stays far
  // below 2^53 for any realistic run (~10^11 ticks before it matters).
  if (!Number.isSafeInteger(gpTotal)) throw new Error(`total gp exceeds MAX_SAFE_INTEGER: ${gpTotal}`);
  const expectedGp = state.ledger.gpInitial + state.ledger.gpMinted - state.ledger.gpBurned;
  if (gpTotal !== expectedGp) {
    throw new Error(`gp conservation broken: in-world ${gpTotal}, ledger expects ${expectedGp}`);
  }

  for (const def of state.items) {
    let total = 0;
    for (const a of state.agents) {
      const held = a.inventory[def.id] ?? 0;
      if (held < 0) throw new Error(`agent ${a.id} has negative ${def.id}: ${held}`);
      total += held;
    }
    const book = state.books[def.id];
    if (book) for (const o of book.sells) total += o.remaining;
    const expected =
      (state.ledger.itemsInitial[def.id] ?? 0) +
      (state.ledger.itemsMinted[def.id] ?? 0) -
      (state.ledger.itemsBurned[def.id] ?? 0);
    if (total !== expected) {
      throw new Error(`item conservation broken for ${def.id}: in-world ${total}, ledger expects ${expected}`);
    }
  }
}

function assertSorted(orders: Order[], dir: 1 | -1, label: string): void {
  for (let i = 1; i < orders.length; i++) {
    const a = orders[i - 1] as Order;
    const b = orders[i] as Order;
    const ok =
      a.price !== b.price
        ? dir === 1
          ? a.price < b.price
          : a.price > b.price
        : a.tick !== b.tick
          ? a.tick < b.tick
          : a.id < b.id;
    if (!ok) throw new Error(`${label} out of order at index ${i} (orders ${a.id}, ${b.id})`);
  }
}
