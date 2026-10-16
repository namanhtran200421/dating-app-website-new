import { Component, inject } from '@angular/core';
import { HomeFaq } from './components/faq/faq';
import { SwipeDemo } from './components/swipe-demo/swipe-demo';
import { SignupState } from './signup-state';

@Component({
  selector: 'app-landing',
  imports: [HomeFaq, SwipeDemo],
  templateUrl: './landing.html',
  styleUrls: [
    '../../../generated/icons/pages-landing.css',
    './landing.css',
    '../../../landing-steps.css',
  ],
})
export class Landing {
  protected readonly signup = inject(SignupState);
}
