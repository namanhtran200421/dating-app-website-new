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
      headline: 'Start swiping and see where it goes.',
      price: '$0',
      cadence: 'forever',
      priceLabel: 'forever',
      badge: 'Free',
      description:
        'Weekly Circles, discovery, matching and messaging — all the essentials to get started.',
      features: [
        'Weekly Circles',
        'Circle chat & activities',
        'Matching & messaging',
        'Basic filters',
        '10 Discover profiles daily',
        '3 rewinds a week',
        '1 Super Like a week',
      ],
    },
    {
      name: 'Advanced',
      shortLine: 'More visibility',
      headline: 'Get more visibility and start more conversations.',
      price: '$11.99',
      cadence: 'per month',
      priceLabel: '/ month',
      badge: 'Advanced',
      description: 'More visibility, more discovery and more ways to start conversations.',
      features: [
        'Everything in Free',
        'See who likes you',
        '20 Discover profiles daily',
        'Advanced filters',
        'Unlimited rewinds',
        '3 Super Likes a week',
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
