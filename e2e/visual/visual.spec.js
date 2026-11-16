import { test, expect } from '@playwright/test';

const TIMEOUT = 45_000;

async function openDeterministic(page, width = 1280, height = 800) {
  await page.setViewportSize({ width, height });
  await page.goto('/?quality=medium&e2e=1');
  await expect(page.locator('#loader')).toBeHidden({ timeout: TIMEOUT });
  await page.waitForFunction(() => window.__E2E_READY__ === true, null, { timeout: TIMEOUT });
  await page.waitForTimeout(500);
}

function canvas(page) {
  return page.locator('#webgl-canvas');
}

test('escena por defecto', async ({ page }) => {
  await openDeterministic(page);
  await expect(canvas(page)).toHaveScreenshot('default.png', { maxDiffPixelRatio: 0.002 });
});

test('Titán enfocado', async ({ page }) => {
  await openDeterministic(page);
  await page.click('#btn-titan');
  await page.waitForTimeout(400);
  await expect(canvas(page)).toHaveScreenshot('titan.png', { maxDiffPixelRatio: 0.002 });
});

test('misión Pioneer 11', async ({ page }) => {
  await openDeterministic(page);
  await page.selectOption('#mission-selector', 'pioneer11');
  await page.waitForTimeout(500);
  await expect(canvas(page)).toHaveScreenshot('mission-pioneer.png', {
    maxDiffPixelRatio: 0.002
  });
});

test('vista de instrumento', async ({ page }) => {
  await openDeterministic(page);
  await page.selectOption('#mission-selector', 'pioneer11');
  await page.click('#btn-instrument-view');
  await page.waitForTimeout(500);
  await expect(canvas(page)).toHaveScreenshot('instrument.png', {
    maxDiffPixelRatio: 0.002
  });
});

test('móvil vertical', async ({ page }) => {
  await openDeterministic(page, 390, 844);
  await expect(canvas(page)).toHaveScreenshot('mobile.png', { maxDiffPixelRatio: 0.002 });
});
