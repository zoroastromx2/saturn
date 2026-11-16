import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test('respeta el movimiento reducido y expone la semántica accesible', async ({ page }) => {
  await page.goto('/?quality=low');
  await expect(page.locator('#loader')).toBeHidden({ timeout: 45_000 });

  await expect(page.locator('#loader')).toHaveAttribute('role', 'status');
  await expect(page.locator('#loader')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('#webgl-canvas')).toHaveAttribute('role', 'img');

  const duration = await page
    .locator('#btn-saturn')
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(duration)).toBeLessThan(0.05);
});
