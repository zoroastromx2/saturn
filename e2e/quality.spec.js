import { test, expect } from '@playwright/test';

test('el preset low solo descarga texturas low y no audio', async ({ page }) => {
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('/?quality=low');
  await expect(page.locator('#loader')).toBeHidden({ timeout: 45_000 });
  await page.waitForTimeout(4_000);

  const textures = requests.filter((url) => url.includes('/textures/'));
  expect(textures.length).toBeGreaterThan(0);
  expect(textures.every((url) => url.includes('/textures/low/'))).toBe(true);
  expect(requests.some((url) => url.includes('/audio/'))).toBe(false);
});
