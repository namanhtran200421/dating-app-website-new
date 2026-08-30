import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then((m) => m.Landing),
    data: {
      seo: {
        title: 'Rosemarry | A New Kind of Dating App',
        description:
          'Rosemarry is a dating app built around weekly Circles, shared activities and real conversation. Get to know compatible people before deciding who you want to match with.',
        canonicalPath: '/',
        pageType: 'WebSite',
      },
    },
  },
  {
    path: 'circle',
    loadComponent: () => import('./pages/circle/circle').then((m) => m.CirclePage),
    data: {
      seo: {
        title: 'Circle | Meet People Before You Decide | Rosemarry',
        description:
          'Meet compatible people in a small weekly Circle through conversation, prompts and shared activities before deciding who you want to match with.',
        canonicalPath: '/circle',
        pageType: 'WebPage',
      },
    },
  },
  {
    path: 'how-it-works',
    loadComponent: () => import('./pages/how-it-works/how-it-works').then((m) => m.HowItWorksPage),
    data: {
      seo: {
        title: 'How Rosemarry Works | The Rosemarry Approach',
        description:
          'See how Rosemarry uses six-day Circles, shared activities and repeated interaction to help compatible people get to know each other.',
        canonicalPath: '/how-it-works',
        pageType: 'WebPage',
      },
    },
  },
  {
    path: 'blog',
    loadComponent: () => import('./pages/blog/blog').then((m) => m.BlogPage),
    data: {
      seo: {
        title: 'Rosemarry Blog | A More Human Way to Date',
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
        title: 'Contact Rosemarry – Support, Feedback & Partnerships',
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
        title: 'About Rosemarry – Building a Fairer Dating App',
        description:
          'Meet the people building Rosemarry and learn why we are creating a fairer, safer and more useful dating app.',
        canonicalPath: '/about-us',
        pageType: 'AboutPage',
      },
    },
  },
  {
    path: 'privacy-and-terms',
    loadComponent: () => import('./policie-page/policie-page').then((m) => m.PoliciePage),
    data: {
      seo: {
        title: 'Privacy Policy & Terms – Rosemarry',
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
