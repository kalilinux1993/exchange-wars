import type { ItemDef } from './types';

export const DEFAULT_ITEMS: ItemDef[] = [
  { id: 'iron_ore', name: 'Iron ore', baseCost: 80, consumeValue: 200, volatility: 0.1 },
  { id: 'lobster', name: 'Lobster', baseCost: 120, consumeValue: 300, volatility: 0.08 },
  { id: 'yew_log', name: 'Yew logs', baseCost: 200, consumeValue: 450, volatility: 0.12 },
  { id: 'nature_rune', name: 'Nature rune', baseCost: 150, consumeValue: 280, volatility: 0.06 },
  { id: 'rune_scimitar', name: 'Rune scimitar', baseCost: 14000, consumeValue: 26000, volatility: 0.05 },
];
