import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then((m) => m.Landing),
    data: {
      seo: {
        title: 'Rosemarry – A Fairer, Safer Dating App',
        description:
          'Rosemarry is a fairer dating app built around compatibility, safer conversations and useful free features. Join the early-access waitlist.',
        canonicalPath: '/',
        pageType: 'WebSite',
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
    loadComponent: () =>
      import('./pages/about-us-page/about-us-page').then((m) => m.AboutUsPage),
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
