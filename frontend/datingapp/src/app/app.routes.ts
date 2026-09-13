import { Routes } from '@angular/router';
import { articles } from './pages/blog/article-catalog';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then((m) => m.Landing),
    data: {
      seo: {
        title: 'Rosemarry | An Interaction-First Dating App',
        description:
          'Rosemarry is an early-stage dating app built around weekly Circles, shared activities and real conversation. The app is still in development.',
        canonicalPath: '/',
        pageType: 'WebPage',
      },
    },
  },
  {
    path: 'circle',
    loadComponent: () => import('./pages/circle/circle').then((m) => m.CirclePage),
    data: {
      seo: {
        title: 'Weekly Circles | How Rosemarry Works',
        description:
          'Meet compatible people in a small weekly Circle through conversation, prompts and shared activities before deciding who you want to match with.',
        canonicalPath: '/circle',
        pageType: 'WebPage',
      },
    },
  },
  ...articles.map((article) => ({
    path: `blog/${article.slug}`,
    loadComponent: () => import('./pages/blog/article').then((m) => m.ArticlePage),
    data: {
      article,
      seo: {
        title: `${article.title} | Rosemarry`,
        description: article.description,
        canonicalPath: `/blog/${article.slug}`,
        pageType: 'WebPage',
        article,
      },
    },
  })),
  {
    path: 'blog',
    loadComponent: () => import('./pages/blog/blog').then((m) => m.BlogPage),
    data: {
      seo: {
        title: 'Dating Blog | Rosemarry',
        description:
          'Read about endless swiping, dating app fatigue and how attraction can grow through familiarity and real interaction.',
        canonicalPath: '/blog',
        pageType: 'WebPage',
      },
    },
  },
  {
    path: 'contact-us',
    loadComponent: () => import('./pages/contact-us/contact-us').then((m) => m.ContactUs),
    data: {
      seo: {
        title: 'Contact Rosemarry | Support, Press & Partnerships',
        description:
          'Contact the Rosemarry team about support, product feedback, partnerships or press.',
        canonicalPath: '/contact-us',
        pageType: 'ContactPage',
      },
    },
  },
  {
    path: 'about-us',
    loadComponent: () => import('./pages/about-us-page/about-us-page').then((m) => m.AboutUsPage),
    data: {
      seo: {
        title: 'About Rosemarry | Founders and Mission',
        description:
          'Meet the people building Rosemarry and learn why we are creating a fairer, safer and more useful dating app.',
        canonicalPath: '/about-us',
        pageType: 'AboutPage',
      },
    },
  },
  {
    path: 'press',
    loadComponent: () => import('./pages/press/press').then((m) => m.PressPage),
    data: {
      seo: {
        title: 'Press Kit | Rosemarry',
        description:
          'Official Rosemarry facts, dating app status, founders, brand assets and press contact details.',
        canonicalPath: '/press',
        pageType: 'AboutPage',
      },
    },
  },
  {
    path: 'privacy-and-terms',
    loadComponent: () => import('./policie-page/policie-page').then((m) => m.PoliciePage),
    data: {
      seo: {
        title: 'Privacy, Safety & Terms | Rosemarry',
        description:
          'Read Rosemarry’s privacy policy, safety commitments and website terms of use.',
        canonicalPath: '/privacy-and-terms',
        pageType: 'WebPage',
      },
    },
  },
  {
    path: 'policy-page',
    redirectTo: 'privacy-and-terms',
    pathMatch: 'full',
  },
  { path: 'how-it-works', redirectTo: 'circle', pathMatch: 'full' },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
    data: {
      seo: {
        title: 'Page Not Found – Rosemarry',
        description: 'The page you were looking for could not be found.',
        canonicalPath: '/404',
        pageType: 'WebPage',
        noIndex: true,
      },
    },
  },
];
