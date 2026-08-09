import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';

interface RouteSeoData {
  title: string;
  description: string;
  canonicalPath: string;
  pageType: 'WebSite' | 'WebPage' | 'AboutPage' | 'ContactPage';
  noIndex?: boolean;
}

const SITE_URL = 'https://www.rosemarry.app';
const SOCIAL_IMAGE_URL = `${SITE_URL}/images/rosemarry-social.png`;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  connect(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        startWith(null),
      )
      .subscribe(() => this.updateForCurrentRoute());
  }

  private updateForCurrentRoute(): void {
    let activeRoute = this.route;

    while (activeRoute.firstChild) {
      activeRoute = activeRoute.firstChild;
    }

    const seo = activeRoute.snapshot.data['seo'] as RouteSeoData | undefined;

    if (!seo) {
      return;
    }

    const canonicalUrl = new URL(seo.canonicalPath, SITE_URL).toString();
    const robots = seo.noIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    this.title.setTitle(seo.title);
    this.updateMeta('name', 'description', seo.description);
    this.updateMeta('name', 'robots', robots);
    this.updateMeta('property', 'og:site_name', 'Rosemarry');
    this.updateMeta('property', 'og:type', 'website');
    this.updateMeta('property', 'og:locale', 'en_AU');
    this.updateMeta('property', 'og:title', seo.title);
    this.updateMeta('property', 'og:description', seo.description);
    this.updateMeta('property', 'og:url', canonicalUrl);
    this.updateMeta('property', 'og:image', SOCIAL_IMAGE_URL);
    this.updateMeta('property', 'og:image:width', '1200');
    this.updateMeta('property', 'og:image:height', '630');
    this.updateMeta('property', 'og:image:alt', 'Rosemarry – Real interactions. Real love.');
    this.updateMeta('name', 'twitter:card', 'summary_large_image');
    this.updateMeta('name', 'twitter:title', seo.title);
    this.updateMeta('name', 'twitter:description', seo.description);
    this.updateMeta('name', 'twitter:image', SOCIAL_IMAGE_URL);
    this.updateCanonical(canonicalUrl);
    this.updateStructuredData(seo, canonicalUrl);
  }

  private updateMeta(attribute: 'name' | 'property', key: string, content: string): void {
    this.meta.updateTag({ [attribute]: key, content }, `${attribute}="${key}"`);
  }

  private updateCanonical(url: string): void {
    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }

    canonical.href = url;
  }

  private updateStructuredData(seo: RouteSeoData, canonicalUrl: string): void {
    const existing = this.document.getElementById('rosemarry-structured-data');
    existing?.remove();

    if (seo.noIndex) {
      return;
    }

    const page = {
      '@type': seo.pageType,
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: seo.title,
      description: seo.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-AU',
    };

    const graph = [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Rosemarry',
        url: `${SITE_URL}/`,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/images/rosemarry/logo-160.png`,
          width: 160,
          height: 120,
        },
        sameAs: ['https://www.instagram.com/rosemarry_app/'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'Rosemarry',
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'en-AU',
      },
      page,
    ];

    const script = this.document.createElement('script');
    script.id = 'rosemarry-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    this.document.head.appendChild(script);
  }
}
