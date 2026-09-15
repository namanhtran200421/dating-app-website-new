import { Component } from '@angular/core';

/** Step 4 of "How it works": everyone in the Circle as an avatar grid. Hover-only preview for now. */
@Component({
  selector: 'app-members-demo',
  templateUrl: './members-demo.html',
  styleUrls: ['../demo-card.css', './members-demo.css'],
})
export class MembersDemo {
  // Only four illustrated placeholder avatars exist; the rest fall back to initials.
  protected readonly members: ReadonlyArray<{ name: string; avatar?: string; tone?: string }> = [
    { name: 'Sophia', avatar: '/images/placeholders/profile-1.svg' },
    { name: 'Liam', avatar: '/images/placeholders/profile-2.svg' },
    { name: 'Maya', avatar: '/images/placeholders/profile-3.svg' },
    { name: 'Noah', avatar: '/images/placeholders/profile-4.svg' },
    { name: 'Riley', tone: 'var(--rm-mint)' },
    { name: 'Jessica', tone: 'var(--rm-pink)' },
    { name: 'Olivia', tone: 'color-mix(in srgb, var(--rm-purple) 55%, white)' },
    { name: 'Chloe', tone: 'var(--rm-mint)' },
    { name: 'Marcus', tone: 'var(--rm-pink)' },
  ];
}
