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

    await expect(
      page.getByRole('heading', { name: 'One week. Real time to connect.' }),
    ).toBeVisible();
    await expect(page.locator('.journey-card')).toHaveCount(4);
    await expect(page.locator('.choice-card')).toHaveCount(3);
    await expect(page.locator('.week-board')).toContainText('10 people · 5 days');
    await expect(page.locator('.journey-string')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://www.rosemarry.app/how-it-works',
    );

    await page.getByRole('link', { name: 'Walk through the week' }).click();
    await expect(page).toHaveURL(/#the-week$/);
    await expect(page.locator('#the-week')).toBeInViewport();

    await page.getByRole('link', { name: 'Give me the short version' }).click();
    await expect(page).toHaveURL(/#quick-version$/);
    await expect(page.locator('#quick-version')).toBeInViewport();
    await expect(page.locator('#quick-version').getByRole('link')).toHaveCount(0);

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
  await expect(
    page.getByRole('heading', { name: 'One week. Real time to connect.' }),
  ).toBeVisible();
});

test('homepage call to action opens the dedicated how-it-works route', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('rosemarry-early-stage-dismissed', 'true');
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'See how it works' }).click();

  await expect(page).toHaveURL(/\/how-it-works$/);
});
