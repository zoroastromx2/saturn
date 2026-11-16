import { test, expect } from '@playwright/test';

test('una misión crea sus hitos y su descripción', async ({ page }) => {
  await page.goto('/?quality=low');
  await expect(page.locator('#loader')).toBeHidden({ timeout: 45_000 });

  await page.selectOption('#mission-selector', 'pioneer11');

  await expect(page.locator('.milestone-badge')).toHaveCount(3);
  await expect(page.locator('#mission-description')).toContainText('Sobrevuelo hiperbólico');
});
