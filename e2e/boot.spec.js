import { test, expect } from '@playwright/test';

test.describe('arranque', () => {
  test('compila los shaders y no emite errores de consola', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('/?quality=low');
    await expect(page.locator('#loader')).toBeHidden({ timeout: 45_000 });
    await expect(page.locator('#webgl-canvas')).toBeVisible();
    await page.waitForTimeout(5_000);

    expect(errors).toEqual([]);
  });

  test('la simulación avanza y produce fotogramas', async ({ page }) => {
    await page.goto('/?quality=low');
    await expect(page.locator('#loader')).toBeHidden({ timeout: 45_000 });

    await expect(page.locator('#stats-fps')).not.toHaveText('—', { timeout: 20_000 });
  });
});
