import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'contact-us',
    loadComponent: () => import('./pages/contact-us/contact-us').then((m) => m.ContactUs),
  },

  {
    path:'about-us',
    loadComponent: ()=> import('./pages/about-us-page/about-us-page').then((m)=> m.AboutUsPage),
  },

    {
    path:'policy-page',
    loadComponent: ()=> import('./policie-page/policie-page').then((m)=> m.PoliciePage),
  } 
];
