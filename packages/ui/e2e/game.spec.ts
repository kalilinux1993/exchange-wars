import { expect, test } from '@playwright/test';

// Each test gets a fresh browser context → empty localStorage → the app boots
// a deterministic seed-42 world, paused. Every assertion below is exact.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('boots a fresh seed-42 world, paused, with the full market', async ({ page }) => {
  await expect(page.locator('.masthead h1')).toHaveText('Exchange Wars');
  await expect(page.locator('.clock .value').first()).toHaveText('0');
  await expect(page.locator('.purse .gold')).toHaveText('30,000');
  for (const item of ['Iron ore', 'Coal', 'Shark', 'Grimy ranarr', 'Rune scimitar', 'Rune platebody']) {
    await expect(page.locator('.market')).toContainText(item);
  }
  await expect(page.locator('.purse')).toContainText('net');
  await expect(page.locator('.player')).toContainText('empty satchel');
  await expect(page.locator('.chart')).toContainText('Fortune');
  await expect(page.locator('.feed')).toContainText('no trades yet');
});

test('full trade round-trip: instant buy fill, then instant sell', async ({ page }) => {
  await page.getByText('+1k').click(); // populate the books
  await page.locator('.market tbody tr', { hasText: 'Iron ore' }).click();
  await page.getByLabel('price').fill('500'); // crosses best ask → fills at ask price
  await page.getByLabel('qty').fill('1');
  await page.getByText('place buy offer').click();
  await expect(page.locator('.filled')).toContainText('filled 1 instantly');
  await expect(page.locator('.player')).toContainText('Iron ore');

  await page.getByRole('button', { name: 'sell', exact: true }).click();
  await page.getByLabel('price').fill('1'); // crosses best bid → fills at bid price
  await page.getByLabel('qty').fill('1');
  await page.getByText('place sell offer').click();
  await expect(page.locator('.filled')).toContainText('filled 1 instantly');
  await expect(page.locator('.player')).toContainText('empty satchel');
});

test('fast-forward advances the world and the save survives reload', async ({ page }) => {
  await page.getByText('+1k').click();
  await expect(page.locator('.clock')).toContainText('1,000');
  await page.reload();
  await expect(page.locator('.clock')).toContainText('1,000'); // restored from localStorage snapshot
});

test('slot purchase debits the purse and raises the cap', async ({ page }) => {
  await expect(page.locator('.ticket')).toContainText('0/3 offer slots used');
  await page.getByText('25,000 gp').click();
  await expect(page.locator('.purse .gold')).toHaveText('5,000');
  await expect(page.locator('.ticket')).toContainText('0/4 offer slots used');
  await expect(page.getByText('50,000 gp')).toBeDisabled(); // autoFlip tier 1 now unaffordable
});

test('engine rejection reasons surface in the ticket', async ({ page }) => {
  await page.locator('.market tbody tr', { hasText: 'Rune scimitar' }).click();
  await page.getByLabel('price').fill('14000');
  await page.getByLabel('qty').fill('99'); // ~1.4M gp on a 30k purse
  await page.getByText('place buy offer').click();
  await expect(page.locator('.reject')).toContainText('insufficient-gp');
});
