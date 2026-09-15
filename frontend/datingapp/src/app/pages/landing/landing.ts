import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivitiesDemo } from './components/activities-demo/activities-demo';
import { CircleDemo } from './components/circle-demo/circle-demo';
import { HomeFaq } from './components/faq/faq';
import { InterestsDemo } from './components/interests-demo/interests-demo';
import { MembersDemo } from './components/members-demo/members-demo';
import { SignupState } from './signup-state';

@Component({
  selector: 'app-landing',
  imports: [ActivitiesDemo, CircleDemo, HomeFaq, InterestsDemo, MembersDemo, RouterLink],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css', '../../../landing-steps.css'],
})
export class Landing {
  protected readonly signup = inject(SignupState);

  /** Scrolls to a "How it works" step and moves focus there so keyboard users follow along. */
  protected goToStep(step: HTMLElement, title: HTMLElement): void {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    step.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    title.focus({ preventScroll: true });
  }
}
