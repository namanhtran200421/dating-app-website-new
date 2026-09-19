import { expect, test } from '@playwright/test';

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000, columns: 4 },
  { name: 'mobile', width: 390, height: 844, columns: 2 },
]) {
  test(`profile choices replace cards on ${viewport.name}`, async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });

    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('dialog').getByRole('button', { name: 'Keep exploring' }).click();

    const deck = page.locator('.swipe-fan__deck');
    await deck.scrollIntoViewIfNeeded();
    await expect(deck.locator('.swipe-card')).toHaveCount(4);
    await expect(deck.locator('button.swipe-card__btn')).toHaveCount(8);
    await expect
      .poll(() =>
        deck.evaluate((element) =>
          Array.from(element.querySelectorAll('img')).every(
            (image) => (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
      )
      .toBe(true);
    await deck.locator('img').evaluateAll(async (images) => {
      await Promise.allSettled(images.map((image) => (image as HTMLImageElement).decode()));
    });

    const columnCount = await deck.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
    );
    expect(columnCount).toBe(viewport.columns);

    await deck.screenshot({ path: `test-results/profile-stack-${viewport.name}.png` });

    const visibleNames = await deck
      .locator('.swipe-card')
      .evaluateAll((cards) => cards.map((card) => card.getAttribute('aria-label')));
    expect(new Set(visibleNames).size).toBe(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(browserErrors).toEqual([]);
  });
}

test('profiles automatically alternate pass and like choices', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await page.waitForTimeout(1000);
  await expect(page.locator('.swipe-card--passing, .swipe-card--liking')).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Keep exploring' }).click();

  const deck = page.locator('.swipe-fan__deck');
  await deck.scrollIntoViewIfNeeded();
  await deck.locator('img').evaluateAll(async (images) => {
    await Promise.allSettled(images.map((image) => (image as HTMLImageElement).decode()));
  });

  const pauseAutomaticPhase = async (phase: 'passing' | 'liking') => {
    await page.waitForFunction(
      (activePhase) => document.querySelector(`.swipe-card--${activePhase}`),
      phase,
      { polling: 'raf', timeout: 4000 },
    );
    const card = deck.locator(`.swipe-card--${phase}`);
    await card.evaluate((element) => {
      element.getAnimations({ subtree: true }).forEach((animation) => {
        animation.currentTime = 300;
        animation.pause();
      });
    });
    return card;
  };

  const passingCard = await pauseAutomaticPhase('passing');
  await expect(passingCard.locator('.swipe-card__decision')).toHaveText('✕');
  await deck.screenshot({ path: 'test-results/profile-auto-pass.png', animations: 'allow' });
  await passingCard.evaluate((element) => {
    element.getAnimations({ subtree: true }).forEach((animation) => animation.play());
  });

  const likingCard = await pauseAutomaticPhase('liking');
  await expect(likingCard.locator('.swipe-card__decision')).toHaveText('♥');
  await deck.screenshot({ path: 'test-results/profile-auto-like.png', animations: 'allow' });
});
