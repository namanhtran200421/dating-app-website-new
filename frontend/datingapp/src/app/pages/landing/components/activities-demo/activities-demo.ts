import { Component } from '@angular/core';

/** Step 3 of "How it works": this week's shared activities. Hover-only preview for now. */
@Component({
  selector: 'app-activities-demo',
  templateUrl: './activities-demo.html',
  styleUrls: [
    '../../../../../generated/icons/pages-landing-components-activities-demo.css',
    '../demo-card.css',
    './activities-demo.css',
  ],
})
export class ActivitiesDemo {
  // Icon classes are spelled out in full so scripts/generate-icons.mjs can find them.
  protected readonly activities: ReadonlyArray<{
    day: string;
    name: string;
    icon: string;
    tone: 'purple' | 'yellow' | 'pink' | 'mint';
  }> = [
    {
      day: 'Tue',
      name: 'Trivia',
      icon: 'fa-solid fa-lightbulb',
      tone: 'purple',
    },
    {
      day: 'Wed',
      name: 'This or that',
      icon: 'fa-solid fa-shuffle',
      tone: 'yellow',
    },
    {
      day: 'Thu',
      name: 'Guess who?',
      icon: 'fa-solid fa-user-secret',
      tone: 'pink',
    },
    {
      day: 'Fri',
      name: 'Matching answers',
      icon: 'fa-solid fa-heart',
      tone: 'mint',
    },
    {
      day: 'Sat',
      name: 'Pick for someone',
      icon: 'fa-solid fa-wand-magic-sparkles',
      tone: 'purple',
    },
    {
      day: 'Sun',
      name: 'Flirty prompt',
      icon: 'fa-solid fa-champagne-glasses',
      tone: 'yellow',
    },
  ];
}
