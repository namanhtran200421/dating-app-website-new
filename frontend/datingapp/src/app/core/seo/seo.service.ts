import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';
import type { ArticleSummary } from '../../pages/blog/article-catalog';

interface RouteSeoData {
  title: string;
  description: string;
  canonicalPath: string;
  pageType: 'WebPage' | 'AboutPage' | 'ContactPage';
  noIndex?: boolean;
  article?: ArticleSummary;
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
    this.updateMeta('property', 'og:type', seo.article ? 'article' : 'website');
    if (seo.article) {
      this.updateMeta('property', 'article:published_time', `${seo.article.published}T00:00:00+09:30`);
      this.updateMeta('property', 'article:modified_time', `${seo.article.modified}T00:00:00+09:30`);
    } else {
      this.meta.removeTag('property="article:published_time"');
      this.meta.removeTag('property="article:modified_time"');
    }
    this.updateMeta('property', 'og:locale', 'en_AU');
    this.updateMeta('property', 'og:title', seo.title);
    this.updateMeta('property', 'og:description', seo.description);
    this.updateMeta('property', 'og:url', canonicalUrl);
    this.updateMeta('property', 'og:image', SOCIAL_IMAGE_URL);
    this.updateMeta('property', 'og:image:width', '1200');
    this.updateMeta('property', 'og:image:height', '630');
    this.updateMeta('property', 'og:image:alt', 'Rosemarry – Good things take time');
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

    const graph: Record<string, unknown>[] = [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Rosemarry',
        alternateName: 'Rosemarry Dating App',
        url: `${SITE_URL}/`,
        description:
          'An early-stage dating app built around weekly Circles, shared activities and real conversation.',
        email: 'support@rosemarry.app',
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/images/rosemarry/logo-160.png`,
          width: 160,
          height: 120,
        },
        founder: [
          { '@type': 'Person', name: 'Steve Tran' },
          { '@type': 'Person', name: 'Felix Vu' },
          { '@type': 'Person', name: 'Samuel Nicholas' },
        ],
        sameAs: ['https://www.instagram.com/rosemarry_app/'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'Rosemarry',
        alternateName: ['Rosemarry Dating App', 'rosemarry.app'],
        description: 'The official website for Rosemarry, a dating app in development around weekly Circles, shared activities and real conversation.',
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'en-AU',
      },
      page,
    ];

    if (seo.article) {
      graph.push({
        '@type': 'BlogPosting',
        '@id': `${canonicalUrl}#article`,
        headline: seo.article.title,
        description: seo.description,
        url: canonicalUrl,
        mainEntityOfPage: { '@id': `${canonicalUrl}#webpage` },
        image: [SOCIAL_IMAGE_URL],
        datePublished: `${seo.article.published}T00:00:00+09:30`,
        dateModified: `${seo.article.modified}T00:00:00+09:30`,
        author: { '@type': 'Organization', name: 'Rosemarry editorial team', url: `${SITE_URL}/about-us` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        articleSection: seo.article.topic,
        inLanguage: 'en-AU',
      });
      graph.push({
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumbs`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Journal', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: seo.article.title, item: canonicalUrl },
        ],
      });
    }

    if (canonicalUrl === `${SITE_URL}/`) {
      graph.push({
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#frequently-asked-questions`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is Rosemarry?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Rosemarry is an early-stage dating app built around small weekly Circles. It gives compatible people time to talk, try shared activities and get familiar before deciding whether to match.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do weekly Circles work?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'A Circle brings a small group of compatible people together for six days of group chat, prompts and activities. Members can match at any time. A new Circle begins after the current one ends.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is Rosemarry available yet?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. As of 5 September 2026, Rosemarry is still in development and is not available to download. Launch timing and locations have not been announced.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is free, and what costs money?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The current plan keeps weekly Circles, discovery, matching and messaging free. An optional Advanced plan is intended to add visibility, discovery and control features. Features and prices may change before launch.',
            },
          },
          {
            '@type': 'Question',
            name: 'Who is building Rosemarry?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Rosemarry is being built by co-founders Steve Tran, Felix Vu and Samuel Nicholas.',
            },
          },
          {
            '@type': 'Question',
            name: 'How are privacy and safety handled?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Rosemarry is intended for adults aged 18 and over. Planned safeguards include identity checks, reporting, blocking, moderation and controls over future Circles.',
            },
          },
        ],
      });
    }

    const script = this.document.createElement('script');
    script.id = 'rosemarry-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    this.document.head.appendChild(script);
  }
}
