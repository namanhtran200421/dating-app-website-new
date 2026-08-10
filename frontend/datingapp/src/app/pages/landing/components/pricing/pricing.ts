import { Component, inject, signal } from '@angular/core';
import { SignupState } from '../../signup-state';

interface PricingPlan {
  name: string;
  shortLine: string;
  headline: string;
  price: string;
  cadence: string;
  priceLabel: string;
  badge: string;
  description: string;
  features: readonly string[];
}

@Component({
  selector: 'app-landing-pricing',
  templateUrl: './pricing.html',
  styleUrl: './pricing.css',
})
export class Pricing {
  protected readonly signup = inject(SignupState);
  protected readonly activePlan = signal(0);

  protected readonly plans: readonly PricingPlan[] = [
    {
      name: 'Free',
      shortLine: 'No commitment',
      headline: 'Join the circle.',
      price: '$0',
      cadence: 'forever',
      priceLabel: 'forever',
      badge: 'Actually useful',
      description:
        'The complete weekly circle experience, without a paywall between you and a match.',
      features: [
        'A fresh compatibility circle every week',
        'Prompts, activities and group chat',
        'Match with anyone in your circle at any time',
        'Choose who you do not share a future circle with',
      ],
    },
    {
      name: 'Basic',
      shortLine: 'More freedom',
      headline: 'Know a little more.',
      price: '$6.99',
      cadence: 'per month',
      priceLabel: '/ month',
      badge: 'The sweet spot',
      description: 'For people who want more context and control around their weekly circles.',
      features: [
        'Everything in Free',
        'See everyone who has chosen to match with you',
        'More preference filters for future circles',
        'Revisit your past circles',
        'An ad-free experience',
      ],
    },
    {
      name: 'Advanced',
      shortLine: 'The peak experience',
      headline: 'Go deeper.',
      price: '$11.99',
      cadence: 'per month',
      priceLabel: '/ month',
      badge: 'All features',
      description: 'The full Rosemarry experience, with richer compatibility insight.',
      features: [
        'Everything in Basic',
        'Deeper AI compatibility insights',
        'More control over your circle preferences',
        'Extra privacy and profile controls',
        'Early access to new circle activities',
      ],
    },
  ];

  protected get selectedPlan(): PricingPlan {
    return this.plans[this.activePlan()]!;
  }

  protected selectPlan(index: number): void {
    if (index >= 0 && index < this.plans.length) {
      this.activePlan.set(index);
    }
  }
}
