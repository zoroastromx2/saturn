import { test, expect } from '@playwright/test';

test('el contenido de misión cambia a inglés y vuelve a español', async ({ page }) => {
  await page.goto('/?quality=low');
  await expect(page.locator('#loader')).toBeHidden({ timeout: 45_000 });

  await page.click('#btn-toggle-language');
  await expect(page.locator('option[value="huygens"]')).toHaveText('Huygens on Titan · 2005');

  await page.selectOption('#mission-selector', 'huygens');
  await expect(page.locator('#mission-description')).toContainText('Huygens descent');

  await page.click('#btn-toggle-language');
  await expect(page.locator('option[value="huygens"]')).toHaveText('Huygens en Titán · 2005');
  await expect(page.locator('#mission-description')).toContainText('Descenso de Huygens');
});
