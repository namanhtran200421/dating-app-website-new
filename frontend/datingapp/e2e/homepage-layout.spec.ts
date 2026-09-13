import { expect, test } from '@playwright/test';

async function dismissDevelopmentNotice(page: import('@playwright/test').Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Still growing.' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Got it' }).click();
  await expect(dialog).toBeHidden();
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`homepage layout is complete on ${viewport.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto('/');
    await dismissDevelopmentNotice(page);

    for (const selector of [
      '#problem',
      '#how-it-works',
      '.outcome',
      '#inside-circle',
      '.choice',
      '#join',
    ]) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await page.waitForTimeout(750);
    }

    await expect(
      page.getByRole('heading', { name: 'Get to know someone before you match.' }),
    ).toBeVisible();
    await expect(page.locator('.hero-visual .photo-card')).toHaveCount(4);
    await expect(page.locator('.hero-visual .photo-card img')).toHaveCount(4);
    await expect(page.locator('.hero-visual')).not.toHaveAttribute('data-motion-reveal');
    for (const imageName of [
      'hero-candid-concert.jpg',
      'hero-reaction.jpg',
      'hero-two-people.jpg',
      'hero-group.jpg',
    ]) {
      await expect(page.locator(`.hero-visual img[src$="${imageName}"]`)).toBeVisible();
    }
    if (viewport.name === 'desktop') {
      const candidCard = page.locator('.photo-card--one');
      // Hover movement uses the individual rotate/scale properties on top of the resting tilt.
      const readMotion = (element: Element) => {
        const style = getComputedStyle(element);
        return `${style.transform} ${style.rotate} ${style.scale} ${style.translate}`;
      };
      const transformBeforeHover = await candidCard.evaluate(readMotion);
      await candidCard.hover();
      await page.waitForTimeout(350);
      const transformAfterHover = await candidCard.evaluate(readMotion);
      expect(transformAfterHover).not.toBe(transformBeforeHover);
    }
    await expect(page.locator('.hero')).not.toContainText(/Pre-launch|18\+|Built in Adelaide/i);
    const navLogo = page.locator('.site-nav__brand img');
    await expect(navLogo).toBeVisible();
    await expect(page.locator('.footer-brand img')).toBeVisible();
    await expect(navLogo).toHaveAttribute('src', '/images/rosemarry/rose-hand-logo.png');
    const logoDimensions = await navLogo.evaluate((image: HTMLImageElement) => ({
      renderedRatio: image.clientWidth / image.clientHeight,
      naturalRatio: image.naturalWidth / image.naturalHeight,
    }));
    expect(Math.abs(logoDimensions.renderedRatio - logoDimensions.naturalRatio)).toBeLessThan(0.02);
    await expect(page.locator('.footer-bar')).not.toContainText('18+');
    await expect(page.getByRole('heading', { name: 'One week. Four simple steps.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Connect first. Decide after.' })).toBeVisible();
    await expect(page.locator('.problem-grid .outlined-card')).toHaveCount(2);
    await expect(page.locator('.steps-grid .step-card')).toHaveCount(4);
    await expect(
      page.getByRole('heading', { name: 'Less judging. More getting to know.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'For people who want more than another swipe.' }),
    ).toBeVisible();
    await expect(page.locator('.phase-card')).toHaveCount(3);
    await expect(page.locator('.inside-photo')).toHaveCount(4);


    const footerCta = page.locator('.footer-cta');
    const heightBeforeSignup = (await footerCta.boundingBox())?.height;
    await page.getByRole('button', { name: /Save me a spot/ }).click();
    const heightAfterSignup = (await footerCta.boundingBox())?.height;

    expect(heightBeforeSignup).toBeDefined();
    expect(heightAfterSignup).toBeDefined();
    expect(Math.abs(heightAfterSignup! - heightBeforeSignup!)).toBeLessThanOrEqual(1);

    await page
      .locator('.footer-signup__form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect(
      page.getByText('Drop your email so we know where to send the invite.'),
    ).toBeVisible();
    const heightAfterValidation = (await footerCta.boundingBox())?.height;

    expect(heightAfterValidation).toBeDefined();
    expect(Math.abs(heightAfterValidation! - heightBeforeSignup!)).toBeLessThanOrEqual(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('hero photos still react to mouse hover on a touch-capable device', async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto('/');
  await dismissDevelopmentNotice(page);

  const card = page.locator('.photo-card--one');
  const image = card.locator('img');
  const before = await card.evaluate((element) => getComputedStyle(element).transform);
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

  await expect
    .poll(async () => card.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe(before);
  await expect
    .poll(async () => image.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe('none');
  await context.close();
});
