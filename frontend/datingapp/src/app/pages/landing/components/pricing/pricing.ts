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
      headline: 'Start something.',
      price: '$0',
      cadence: 'forever',
      priceLabel: 'forever',
      badge: 'Actually useful',
      description: 'Meet, match, and chat without paying just to make the app work.',
      features: [
        '15 daily likes',
        '5 daily rewinds for the oops moments',
        'Peep 3 people who liked you every day',
        'Filters for the essentials',
      ],
    },
    {
      name: 'Basic',
      shortLine: 'More freedom',
      headline: 'Keep the momentum.',
      price: '$6.99',
      cadence: 'per month',
      priceLabel: '/ month',
      badge: 'The sweet spot',
      description: 'For people who want fewer limits',
      features: [
        'Unlimited likes & rewinds',
        '2 Super Likes every week',
        '3 first-message passes every week',
        'See the whole fan club',
        'Ads gone, filters upgraded',
      ],
    },
    {
      name: 'Advanced',
      shortLine: 'The peak experience',
      headline: 'Go all in.',
      price: '$11.99',
      cadence: 'per month',
      priceLabel: '/ month',
      badge: 'All features',
      description: 'The full Rosemarry toolkit',
      features: [
        'Everything in Basic, obviously',
        '10 Super Likes every week',
        '5 first-message passes every week',
        '2 weekly 30-minute visibility boosts',
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
