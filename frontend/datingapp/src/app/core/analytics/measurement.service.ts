import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { articles } from '../../pages/blog/article-catalog';

export type MeasurementEvent = 'visit' | 'page_view' | 'signup_start' | 'signup_success';
export type SignupPlacement = 'footer' | 'hero' | 'pricing' | 'article';
export const measurementPaths = new Set([
  '/', '/circle', '/blog', '/about-us', '/press', '/contact-us', '/privacy-and-terms',
  ...articles.map((article) => `/blog/${article.slug}`),
]);

// Fixed buckets only: never send query strings, full referrers, email addresses or identifiers.
export function trafficSource(referrer: string, search: string): string {
  const params = new URLSearchParams(search);
  const source = params.get('utm_source')?.toLowerCase();
  if (['cpc', 'ppc', 'paid', 'paid_social'].includes(params.get('utm_medium')?.toLowerCase() || '')) return 'paid';
  if (['email', 'newsletter'].includes(source || '') || params.get('utm_medium') === 'email') return 'email';
  if (['instagram', 'facebook', 'tiktok', 'linkedin'].includes(source || '')) return 'social';
  if (['chatgpt', 'perplexity', 'copilot'].includes(source || '')) return 'ai';
  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    if (/(^|\.)google\.(com|com\.au|co\.uk|ca|co\.nz|de|fr|com\.vn)$/.test(hostname)) return 'google';
    if (/(^|\.)bing\.com$/.test(hostname)) return 'bing';
    if (/(^|\.)(duckduckgo\.com|search\.brave\.com|search\.yahoo\.com)$/.test(hostname)) return 'other_search';
    if (/(^|\.)(chatgpt\.com|perplexity\.ai|copilot\.microsoft\.com)$/.test(hostname)) return 'ai';
    if (/(^|\.)(instagram\.com|facebook\.com|tiktok\.com|linkedin\.com)$/.test(hostname)) return 'social';
    return /(^|\.)rosemarry\.app$/.test(hostname) ? 'direct' : 'referral';
  } catch { return 'direct'; }
}

@Injectable({ providedIn: 'root' })
export class MeasurementService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private connected = false;
  private source = 'direct';
  private landing = '/';
  private previousPath = '';

  connect(): void {
    if (this.connected || !isPlatformBrowser(this.platformId)) return;
    const win = this.document.defaultView;
    if (!win || !['www.rosemarry.app', 'rosemarry.app'].includes(win.location.hostname)) return;
    if (win.navigator.doNotTrack === '1' || (win.navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    const landing = win.location.pathname.replace(/\/$/, '') || '/';
    if (!measurementPaths.has(landing)) return;
    this.connected = true;
    this.landing = landing;
    this.source = trafficSource(this.document.referrer, win.location.search);
    this.track('visit');
    this.pageView();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => this.pageView());
  }

  private pageView(): void {
    const path = this.path();
    if (path === this.previousPath) return;
    this.previousPath = path;
    this.track('page_view');
  }

  private path(): string {
    // During hydration the router may still report '/' for a direct article visit.
    const url = this.router.navigated ? this.router.url : this.document.defaultView?.location.pathname || '/';
    return url.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  }

  track(event: MeasurementEvent, placement: SignupPlacement = 'footer'): void {
    if (!this.connected) return;
    const path = this.path();
    if (!measurementPaths.has(path)) return;
    try {
      void this.document.defaultView?.fetch('https://rosemarry-api.onrender.com/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        keepalive: true,
        body: JSON.stringify({ event, path, landing: this.landing, source: this.source, placement }),
      }).catch(() => undefined);
    } catch { /* Measurement must never interrupt navigation or a signup. */ }
  }
}
