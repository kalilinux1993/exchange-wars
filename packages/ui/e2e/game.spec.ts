import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// Catalog-agnostic: rows are addressed by position, prices chosen so cheap
// items always cross (the first row is the cheapest item by construction).
// Fresh context → empty localStorage → deterministic seed-42 world, paused.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/** Fresh contexts always see the first-run guide — dismiss it to trade. */
async function dismissHelp(page: import('@playwright/test').Page): Promise<void> {
  await page.getByText('start trading').click();
}

test('boots a fresh seed-42 world with the first-run guide, paused, full market', async ({ page }) => {
  await expect(page.locator('.help')).toContainText('How to Play');
  await dismissHelp(page);
  await expect(page.locator('.masthead h1')).toHaveText('Exchange Wars');
  await expect(page.locator('.clock .value').first()).toHaveText('0');
  await expect(page.locator('.purse .gold')).toHaveText('55,000');
  await expect(page.locator('.purse')).toContainText('net');
  await expect(page.locator('.account')).toContainText('sign in');
  // The Exchange room (default)
  expect(await page.locator('.market tbody tr').count()).toBeGreaterThanOrEqual(40);
  await expect(page.locator('.player')).toContainText('empty satchel');
  await expect(page.locator('.feed')).toContainText('no trades yet');
  await expect(page.locator('.ladder')).toContainText('spread');
  await expect(page.locator('.contracts')).toContainText('Quartermaster');
  await expect(page.locator('.chronicle')).toContainText('Chronicle');
  // The Adventure room
  await page.getByRole('tab', { name: /Adventure/ }).click();
  await expect(page.locator('.expedition')).toBeVisible();
  await expect(page.locator('.milestones')).toContainText('Deeds');
  // The Hall
  await page.getByRole('tab', { name: /Hall/ }).click();
  await expect(page.locator('.chart')).toContainText('Fortune');
  await expect(page.locator('.shop')).toContainText("Clerk's Counter");
  await expect(page.locator('.sprintboard')).toBeVisible();
});

test('the PWA manifest is valid and install-rich (19b)', async ({ page }) => {
  // Fetch the SERVED manifest (resolving its href as the browser would) — a JSON typo here silently
  // disables PWA install, so parse + assert the rich-install fields.
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const res = await page.request.get(new URL(href!, page.url()).href);
  expect(res.ok()).toBeTruthy();
  const m = await res.json(); // throws on malformed JSON
  expect(m.name).toBe('Exchange Wars');
  expect(m.display).toBe('standalone');
  expect(m.categories).toContain('games');
  expect(m.screenshots?.[0]?.src).toBe('og.png'); // the deployed 1200×630 card doubles as the install screenshot
  expect(m.screenshots?.[0]?.sizes).toBe('1200x630');
});

test('the page serves social-card meta for shared links (18z)', async ({ page }) => {
  // The brag / challenge / duel loop shares this URL — verify the OG card meta is present.
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\.png$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Exchange Wars/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
});

test('the active room survives a reload', async ({ page }) => {
  await dismissHelp(page);
  await page.getByRole('tab', { name: /Adventure/ }).click();
  await expect(page.locator('.expedition')).toBeVisible();
  await page.reload();
  await expect(page.locator('.expedition')).toBeVisible();
  await expect(page.getByRole('tab', { name: /Adventure/ })).toHaveAttribute('aria-selected', 'true');
});

test('full trade round-trip: instant buy fill, then instant sell', async ({ page }) => {
  await dismissHelp(page);
  await page.getByText('+1k').click(); // populate the books
  await page.locator('.market tbody tr').first().click(); // cheapest item
  await page.getByLabel('price').fill('9999'); // crosses best ask, well within 55k
  await page.getByLabel('qty').fill('1');
  await page.getByText('place buy offer').click();
  await expect(page.locator('.filled')).toContainText('filled 1 instantly');
  await page.getByRole('button', { name: 'sell', exact: true }).click();
  await page.getByLabel('price').fill('1'); // crosses best bid
  await page.getByLabel('qty').fill('1');
  await page.getByText('place sell offer').click();
  await expect(page.locator('.filled')).toContainText('filled 1 instantly');
  await expect(page.locator('.player')).toContainText('empty satchel');
});

test('fast-forward advances the world and the save survives reload', async ({ page }) => {
  await dismissHelp(page);
  await page.getByText('+1k').click();
  await expect(page.locator('.clock')).toContainText('1,000');
  await page.reload();
  await expect(page.locator('.clock')).toContainText('1,000');
});

test('slot purchase debits the purse and raises the cap', async ({ page }) => {
  await dismissHelp(page);
  await expect(page.locator('.ticket')).toContainText('0/3 offer slots used');
  await page.getByRole('tab', { name: /Hall/ }).click(); // the shop lives in the Hall now
  await page.getByText('25,000 gp').click();
  await expect(page.locator('.purse .gold')).toHaveText('30,000'); // purse is global
  await expect(page.getByText('50,000 gp')).toBeDisabled();
  await page.getByRole('tab', { name: /Exchange/ }).click();
  await expect(page.locator('.ticket')).toContainText('0/4 offer slots used');
});

test('mobile viewport: full ticket flow works on a phone-sized screen', async ({ page }) => {
  await dismissHelp(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByText('+1k').click();
  await page.locator('.market tbody tr').first().click();
  await page.getByLabel('price').fill('9999');
  await page.getByLabel('qty').fill('1');
  await page.getByText('place buy offer').click();
  await expect(page.locator('.filled')).toContainText('filled 1 instantly');
});

test('capture README screenshot (on demand)', async ({ page }) => {
  test.skip(!process.env['SCREENSHOT'], 'set SCREENSHOT=1 to capture');
  await page.setViewportSize({ width: 1280, height: 880 });
  await dismissHelp(page);
  await page.getByText('+1k').click();
  await page.locator('.market tbody tr').nth(2).click();
  // Anchor to this spec file — page.screenshot resolves relative paths
  // against the process cwd, which varies (it once escaped the repo).
  // fullPage: the board is taller than the viewport and the README should
  // show the whole game (the RPG panels live below the fold).
  await page.screenshot({
    path: fileURLToPath(new URL('../../../docs/screenshot.png', import.meta.url)),
    fullPage: true,
  });
  // The social-share card (og:image): a 1200×630 viewport of the top-of-Exchange (masthead title +
  // the market) — the standard OG ratio, so challenge/brag links preview as a branded card (18z).
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.screenshot({ path: fileURLToPath(new URL('../public/og.png', import.meta.url)), fullPage: false });
});

test('a #seed challenge link boots that exact world for fresh visitors', async ({ page }) => {
  await page.goto('/#seed=777');
  await dismissHelp(page);
  await expect(page.locator('.clock')).toContainText('777');
});

test('expeditions: embark fists-first and meet whatever the dark sends', async ({ page }) => {
  await dismissHelp(page);
  await page.getByRole('tab', { name: /Adventure/ }).click();
  await expect(page.locator('.expedition')).toContainText('Expeditions');
  await page.getByText('embark').click();
  await page.getByText('venture deeper').click();
  // The encounter mix is deterministic per seed but varied by design:
  // monster, cache, snare, shrine, or dice — all leave a visible trace.
  await expect(page.locator('.expedition')).toContainText(/blocks the path|cache|snare|shrine|dice|imp|portal|merchant|swordmaster|toll|courier/);
  const fight = page.getByRole('button', { name: 'fight', exact: true });
  if (await fight.isVisible()) {
    await fight.click();
    await expect(page.locator('.combatlog')).toBeVisible();
  }
});

test('compact view hides the analysis columns, keeps the price essentials', async ({ page }) => {
  await dismissHelp(page);
  // analysis columns show by default; essentials always
  await expect(page.getByRole('columnheader', { name: /mom/ })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'bid' })).toBeVisible();
  await page.getByRole('button', { name: 'compact', exact: true }).click();
  // the lens columns (mom/margin/band/swing) hide; bid/last/volume stay — verifies the nth-child indices
  await expect(page.getByRole('columnheader', { name: /mom/ })).toBeHidden();
  await expect(page.getByRole('columnheader', { name: /margin/ })).toBeHidden();
  await expect(page.getByRole('columnheader', { name: 'bid' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'volume' })).toBeVisible();
});

test('engine rejection reasons surface in the ticket', async ({ page }) => {
  await dismissHelp(page);
  await page.locator('.market tbody tr').first().click();
  await page.getByLabel('price').fill('49999');
  await page.getByLabel('qty').fill('99'); // ~5M on a 55k purse
  await page.getByText('place buy offer').click();
  await expect(page.locator('.reject')).toContainText('insufficient-gp');
});

test('a resting offer shows the gold "resting" confirmation (18h/18k)', async ({ page }) => {
  await dismissHelp(page);
  await page.locator('.market tbody tr').first().click();
  await page.getByLabel('price').fill('1'); // far below any ask → rests, no instant fill
  await page.getByLabel('qty').fill('1');
  await page.getByText('place buy offer').click();
  const resting = page.locator('.resting');
  await expect(resting).toContainText('resting on the book');
  // the stylesheet loaded and the rule applies (real-browser CSS check): --gold #d4a937
  await expect(resting).toHaveCSS('color', 'rgb(212, 169, 55)');
});
