import { expect, test } from '@playwright/test';

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`how-it-works page is clear and complete on ${viewport.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto('/how-it-works');

    await expect(page.getByRole('heading', { name: 'How Circles work.' })).toBeVisible();
    await expect(page.locator('.journey-card')).toHaveCount(3);
    await expect(
      page.getByRole('heading', { name: 'Like someone. If it’s mutual, it’s a match.' }),
    ).toBeAttached();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://www.rosemarry.app/how-it-works',
    );

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('site navigation opens the dedicated how-it-works route', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/about-us');
  await page.locator('.nav-desktop').getByRole('link', { name: 'How it works' }).click();

  await expect(page).toHaveURL(/\/how-it-works$/);
  await expect(page.getByRole('heading', { name: 'How Circles work.' })).toBeVisible();
});
