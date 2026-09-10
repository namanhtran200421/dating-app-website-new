import { test, expect } from '@playwright/test';

test('journal navigation updates metadata and removes article tags on the homepage', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/blog');
  await page.locator('.blog-article h2 a').first().click();
  await expect(page).toHaveURL(/\/blog\/dating-without-swiping$/);
  await expect(page.locator('h1')).toHaveText('Dating without swiping: what to look for');
  await expect(page.locator('time')).toHaveText('5 September 2026');
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await page
    .getByRole('navigation', { name: 'Related articles' })
    .getByRole('link', { name: 'Can attraction grow over time?' })
    .click();
  await expect(page.locator('h1')).toHaveText('Can attraction grow over time?');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://www.rosemarry.app/blog/attraction-over-time',
  );
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Home', exact: true })
    .click();
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  await expect(page.locator('meta[property="article:published_time"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('article is readable on mobile and with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/blog/endless-swiping');
  await expect(page.locator('h1')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'What choice-overload research found' }),
  ).toBeVisible();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await context.close();
});

test('the enforced security policy works across every public page', async ({ page }) => {
  const cspViolations: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (/content security policy|refused to (?:load|connect|execute)/i.test(message.text())) {
      cspViolations.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.turnstile={render:function(){return 'test-widget';},reset:function(){},remove:function(){}};`,
    }),
  );
  await page.route('https://rosemarry-api.onrender.com/**', (route) =>
    route.fulfill({ status: 204 }),
  );

  for (const path of [
    '/',
    '/circle',
    '/blog',
    '/about-us',
    '/press',
    '/contact-us',
    '/privacy-and-terms',
    '/blog/dating-without-swiping',
    '/blog/endless-swiping',
    '/blog/dating-app-fatigue',
    '/blog/attraction-over-time',
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} should load`).toBe(200);
    expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
    await expect(page.locator('main')).toBeAttached();
  }

  expect(cspViolations).toEqual([]);
  expect(pageErrors).toEqual([]);
});

for (const successful of [true, false]) {
  test(`signup ${successful ? 'success records one conversion' : 'failure records no conversion'}`, async ({
    page,
  }) => {
    const events: Record<string, string>[] = [];
    const cspViolations: string[] = [];
    let registrations = 0;
    page.on('console', (message) => {
      if (/content security policy|refused to (?:load|connect|execute)/i.test(message.text())) {
        cspViolations.push(message.text());
      }
    });
    await page.route('https://www.rosemarry.app/**', async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({
        url: `http://127.0.0.1:4173${url.pathname}${url.search}`,
      });
      await route.fulfill({ response });
    });
    await page.route('https://challenges.cloudflare.com/**', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: `window.turnstile={render:function(el,options){setTimeout(()=>options.callback('test-token'),10);return 'test-widget';},reset:function(){},remove:function(){}};`,
      }),
    );
    await page.route('https://rosemarry-api.onrender.com/**', async (route) => {
      const headers = {
        'access-control-allow-origin': 'https://www.rosemarry.app',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'POST,OPTIONS',
      };
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers });
        return;
      }
      if (route.request().url().endsWith('/analytics')) {
        events.push(route.request().postDataJSON());
        await route.fulfill({ status: 204, headers });
      } else {
        registrations++;
        await route.fulfill({
          status: successful ? 202 : 503,
          headers,
          contentType: 'application/json',
          body: JSON.stringify({
            success: successful,
            message: successful ? 'Signup request accepted.' : 'Temporarily unavailable',
          }),
        });
      }
    });
    await page.goto(
      'https://www.rosemarry.app/blog/dating-without-swiping?utm_source=instagram&email=private@example.com',
    );
    await page.locator('.article-signup').getByRole('link', { name: 'Join early access' }).click();
    await page.getByLabel('Your email for early-access updates').fill('reader@example.com');
    await expect(page.locator('.footer-signup__form button[type="submit"]')).toBeEnabled();
    await page.locator('.footer-signup__form button[type="submit"]').click();
    if (successful) {
      await expect(page.locator('.footer-signup__success')).toContainText(
        'We saved reader@example.com',
      );
      await expect
        .poll(() => events.filter((event) => event['event'] === 'signup_success').length)
        .toBe(1);
    } else {
      await expect(page.locator('.footer-signup__error')).toBeVisible();
      expect(events.filter((event) => event['event'] === 'signup_success')).toHaveLength(0);
    }
    expect(registrations).toBe(1);
    expect(events.filter((event) => event['event'] === 'visit')).toHaveLength(1);
    expect(events.filter((event) => event['event'] === 'page_view')).toHaveLength(1);
    expect(events.find((event) => event['event'] === 'signup_start')).toMatchObject({
      source: 'social',
      placement: 'article',
      landing: '/blog/dating-without-swiping',
    });
    expect(JSON.stringify(events)).not.toMatch(/@|utm_|private|reader/);
    expect(cspViolations).toEqual([]);
  });
}

test('unknown URLs return a real 404', async ({ request }) => {
  const response = await request.get('/blog/this-article-does-not-exist');
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain('noindex');
});
