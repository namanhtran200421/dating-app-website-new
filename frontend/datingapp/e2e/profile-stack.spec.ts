import { expect, test } from '@playwright/test';

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
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
    const phone = page.locator('.swipe-phone');
    await deck.scrollIntoViewIfNeeded();
    await expect(deck.locator('.swipe-card')).toHaveCount(2);
    await expect(deck.locator('.swipe-card--active')).toHaveCount(1);
    await expect(deck.locator('.swipe-card--queued')).toHaveCount(1);
    await expect(deck.locator('button.swipe-card__btn')).toHaveCount(4);
    await expect(deck.locator('.swipe-card--active button.swipe-card__btn')).toHaveCount(2);
    await expect(deck.locator('.swipe-card--active button.swipe-card__btn').first()).toBeEnabled();
    await expect(deck.locator('.swipe-card--queued button.swipe-card__btn')).toHaveCount(2);
    await expect(deck.locator('.swipe-card--queued button.swipe-card__btn').first()).toBeDisabled();
    await expect(page.locator('.swipe-phone__appbar')).toHaveCount(0);
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

    const cardFitsScreen = await page.locator('.swipe-phone__screen').evaluate((screen) => {
      const card = screen.querySelector('.swipe-card--active')!.getBoundingClientRect();
      const bounds = screen.getBoundingClientRect();
      return card.top >= bounds.top && card.bottom <= bounds.bottom;
    });
    expect(cardFitsScreen).toBe(true);

    await phone.screenshot({ path: `test-results/profile-stack-${viewport.name}.png` });

    const visibleNames = await deck
      .locator('.swipe-card')
      .evaluateAll((cards) => cards.map((card) => card.getAttribute('aria-label')));
    expect(new Set(visibleNames).size).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(browserErrors).toEqual([]);
  });
}

test('profiles automatically choose a random swipe direction', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    const choices = [0.1, 0.9];
    Math.random = () => choices.shift() ?? 0.9;
  });
  await page.goto('/');

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
    await expect(deck.locator('.swipe-card--revealing')).toHaveCount(1);
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

test('automatic swiping starts without a visibility or dialog trigger', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.swipe-card--passing, .swipe-card--liking')).toHaveCount(1, {
    timeout: 2000,
  });
});

test('reduced-motion mode keeps the swipe transition visible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Math.random = () => 0.1;
  });
  await page.goto('/');
  await page.getByRole('dialog').getByRole('button', { name: 'Keep exploring' }).click();

  const deck = page.locator('.swipe-fan__deck');
  await deck.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('.swipe-card--passing'), undefined, {
    polling: 'raf',
    timeout: 4000,
  });

  const duration = await deck.locator('.swipe-card--passing').evaluate((card) =>
    card
      .getAnimations()
      .map((animation) => Number(animation.effect?.getComputedTiming().duration))
      .find((value) => value > 0),
  );
  expect(duration).toBe(1000);
});
