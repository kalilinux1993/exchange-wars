// O(1) item lookup. state.items is fixed at createWorld and never mutated
// in place, so an index keyed on the ARRAY'S IDENTITY is safe: a JSON
// snapshot/restore produces a new array and therefore a fresh index. This is
// a pure derived cache — no state shape change, no behavior change (the
// profile showed items.find() inside playerView/buyRemaining was O(items²)
// and 73% of sim self-time at 84 items).
import type { ItemDef, ItemId, WorldState } from './types';

const ITEM_INDEX = new WeakMap<readonly ItemDef[], Map<ItemId, ItemDef>>();

export function itemDef(state: WorldState, itemId: ItemId | undefined): ItemDef | undefined {
  if (itemId === undefined) return undefined;
  let index = ITEM_INDEX.get(state.items);
  if (!index) {
    index = new Map(state.items.map((i) => [i.id, i]));
    ITEM_INDEX.set(state.items, index);
  }
  return index.get(itemId);
}
