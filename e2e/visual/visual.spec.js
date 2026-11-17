import { test, expect } from '@playwright/test';

test.describe.configure({ retries: 0, timeout: 180_000 });

const TIMEOUT = 60_000;
const VIEWPORT = { width: 1280, height: 720 };

async function openDeterministic(page, viewport = VIEWPORT) {
  await page.setViewportSize(viewport);
  await page.goto('/?quality=low&e2e=1');
  await expect(page.locator('#loader')).toBeHidden({ timeout: TIMEOUT });
  await page.waitForFunction(() => window.__E2E_READY__ === true, null, { timeout: TIMEOUT });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
  await page.waitForTimeout(800);
}

function canvas(page) {
  return page.locator('#webgl-canvas');
}

test('escena por defecto', async ({ page }) => {
  await openDeterministic(page);
  await expect(canvas(page)).toHaveScreenshot('default.png', {
    maxDiffPixelRatio: 0.03,
    threshold: 0.3
  });
});

test('Titán enfocado', async ({ page }) => {
  await openDeterministic(page);
  await page.click('#btn-titan');
  await page.waitForTimeout(600);
  await expect(canvas(page)).toHaveScreenshot('titan.png', {
    maxDiffPixelRatio: 0.03,
    threshold: 0.3
  });
});

test('misión Pioneer 11', async ({ page }) => {
  await openDeterministic(page);
  await page.selectOption('#mission-selector', 'pioneer11');
  await page.waitForTimeout(700);
  await expect(canvas(page)).toHaveScreenshot('mission-pioneer.png', {
    maxDiffPixelRatio: 0.03,
    threshold: 0.3
  });
});

test('vista de instrumento', async ({ page }) => {
  await openDeterministic(page);
  await page.selectOption('#mission-selector', 'pioneer11');
  await page.click('#btn-instrument-view');
  await page.waitForTimeout(700);
  await expect(canvas(page)).toHaveScreenshot('instrument.png', {
    maxDiffPixelRatio: 0.03,
    threshold: 0.3
  });
});

test('móvil vertical', async ({ page }) => {
  await openDeterministic(page, { width: 390, height: 844 });
  await expect(canvas(page)).toHaveScreenshot('mobile.png', {
    maxDiffPixelRatio: 0.03,
    threshold: 0.3
  });
});
