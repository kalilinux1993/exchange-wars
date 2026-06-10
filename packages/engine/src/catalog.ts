import type { ItemDef } from './types';

// Price tiers span ~80 gp to ~65k gp so every capital level has a market.
// Keep consumeValue ≳ 2× baseCost — the [cost..value] band is where flip
// margins live, and the market gate asserts every item stays anchored in it.
export const DEFAULT_ITEMS: ItemDef[] = [
  { id: 'feather', name: 'Feather', baseCost: 30, consumeValue: 90, volatility: 0.07 },
  { id: 'clay', name: 'Soft clay', baseCost: 45, consumeValue: 130, volatility: 0.11 },
  { id: 'willow_log', name: 'Willow logs', baseCost: 60, consumeValue: 160, volatility: 0.09 },
  { id: 'iron_ore', name: 'Iron ore', baseCost: 80, consumeValue: 200, volatility: 0.1 },
  { id: 'bronze_bar', name: 'Bronze bar', baseCost: 90, consumeValue: 210, volatility: 0.08 },
  { id: 'coal', name: 'Coal', baseCost: 120, consumeValue: 260, volatility: 0.09 },
  { id: 'lobster', name: 'Lobster', baseCost: 120, consumeValue: 300, volatility: 0.08 },
  { id: 'nature_rune', name: 'Nature rune', baseCost: 150, consumeValue: 280, volatility: 0.06 },
  { id: 'cannonball', name: 'Cannonball', baseCost: 150, consumeValue: 320, volatility: 0.06 },
  { id: 'snape_grass', name: 'Snape grass', baseCost: 300, consumeValue: 650, volatility: 0.12 },
  { id: 'gold_ore', name: 'Gold ore', baseCost: 350, consumeValue: 700, volatility: 0.09 },
  { id: 'law_rune', name: 'Law rune', baseCost: 180, consumeValue: 350, volatility: 0.07 },
  { id: 'yew_log', name: 'Yew logs', baseCost: 200, consumeValue: 450, volatility: 0.12 },
  { id: 'steel_bar', name: 'Steel bar', baseCost: 550, consumeValue: 1050, volatility: 0.07 },
  { id: 'shark', name: 'Shark', baseCost: 600, consumeValue: 1100, volatility: 0.08 },
  { id: 'magic_log', name: 'Magic logs', baseCost: 900, consumeValue: 1800, volatility: 0.11 },
  { id: 'mithril_bar', name: 'Mithril bar', baseCost: 950, consumeValue: 1750, volatility: 0.08 },
  { id: 'green_dhide', name: "Green d'hide", baseCost: 1300, consumeValue: 2500, volatility: 0.09 },
  { id: 'adamant_bar', name: 'Adamant bar', baseCost: 1700, consumeValue: 3200, volatility: 0.08 },
  { id: 'dragon_bones', name: 'Dragon bones', baseCost: 2600, consumeValue: 4800, volatility: 0.09 },
  { id: 'amethyst', name: 'Amethyst', baseCost: 3200, consumeValue: 6000, volatility: 0.1 },
  { id: 'onyx_bolt_tips', name: 'Onyx bolt tips', baseCost: 4000, consumeValue: 7600, volatility: 0.11 },
  { id: 'grimy_ranarr', name: 'Grimy ranarr', baseCost: 4500, consumeValue: 8200, volatility: 0.14 },
  { id: 'prayer_potion', name: 'Prayer potion', baseCost: 5000, consumeValue: 9500, volatility: 0.1 },
  { id: 'uncut_dragonstone', name: 'Uncut dragonstone', baseCost: 9000, consumeValue: 17000, volatility: 0.13 },
  { id: 'runite_ore', name: 'Runite ore', baseCost: 10500, consumeValue: 19500, volatility: 0.12 },
  { id: 'rune_scimitar', name: 'Rune scimitar', baseCost: 14000, consumeValue: 26000, volatility: 0.05 },
  { id: 'dragon_dagger', name: 'Dragon dagger', baseCost: 17500, consumeValue: 31000, volatility: 0.07 },
  { id: 'rune_platebody', name: 'Rune platebody', baseCost: 38000, consumeValue: 65000, volatility: 0.06 },
  // Aspirational top shelf — automation budgets can't touch it (by design).
  { id: 'abyssal_whip', name: 'Abyssal whip', baseCost: 120000, consumeValue: 220000, volatility: 0.07 },
];
