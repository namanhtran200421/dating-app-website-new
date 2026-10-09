import { Component, OnDestroy, computed, signal } from '@angular/core';

interface CircleMember {
  name: string;
  avatar: string;
  returning?: boolean;
}

const CIRCLES: ReadonlyArray<ReadonlyArray<CircleMember>> = [
  [
    { name: 'Asha', avatar: '/img/rosemarry/profile-asha-original-240.webp' },
    { name: 'Daniel', avatar: '/img/rosemarry/profile-daniel-240.webp' },
    { name: 'Mia', avatar: '/img/rosemarry/profile-mia-original-240.webp' },
    { name: 'Jonah', avatar: '/img/rosemarry/profile-jonah-original-240.webp' },
    { name: 'Elena', avatar: '/img/rosemarry/profile-elena-240.webp' },
    { name: 'Steve', avatar: '/img/rosemarry/profile-steve-candid-240.webp' },
    { name: 'Priya', avatar: '/img/rosemarry/profile-priya-240.webp' },
    { name: 'Sophia', avatar: '/img/rosemarry/profile-jessica-generated-240.webp' },
    { name: 'Liam', avatar: '/img/rosemarry/profile-riley-generated-240.webp' },
  ],
  [
    { name: 'Mia', avatar: '/img/rosemarry/profile-mia-original-240.webp', returning: true },
    { name: 'Steve', avatar: '/img/rosemarry/profile-steve-candid-240.webp', returning: true },
    { name: 'Priya', avatar: '/img/rosemarry/profile-priya-240.webp', returning: true },
    { name: 'Maya', avatar: '/images/placeholders/profile-3.svg' },
    { name: 'Noah', avatar: '/images/placeholders/profile-4.svg' },
    { name: 'Riley', avatar: '/img/rosemarry/profile-riley-generated-240.webp' },
    { name: 'Jessica', avatar: '/img/rosemarry/profile-jessica-generated-240.webp' },
    { name: 'Arjun', avatar: '/img/rosemarry/profile-arjun-generated-240.webp' },
    { name: 'Chloe', avatar: '/img/rosemarry/profile-chloe-generated-240.webp' },
  ],
];

type TransitionPhase = 'idle' | 'leaving' | 'entering';

/** Step 4 of "How it works": click through weekly Circles and spot familiar faces. */
@Component({
  selector: 'app-members-demo',
  templateUrl: './members-demo.html',
  styleUrls: ['../demo-card.css', './members-demo.css'],
})
export class MembersDemo implements OnDestroy {
  protected readonly circleIndex = signal(0);
  protected readonly phase = signal<TransitionPhase>('idle');
  protected readonly members = computed(() => CIRCLES[this.circleIndex()]);
  protected readonly announcement = signal('Circle 1 shown.');

  private transitionTimer?: number;

  showNextCircle(): void {
    if (this.phase() !== 'idle') return;

    this.phase.set('leaving');
    this.transitionTimer = window.setTimeout(() => {
      const nextIndex = (this.circleIndex() + 1) % CIRCLES.length;
      this.circleIndex.set(nextIndex);
      this.announcement.set(
        nextIndex === 1 ? 'Circle 2 shown. Returning members are highlighted.' : 'Circle 1 shown.',
      );
      this.phase.set('entering');
      this.transitionTimer = window.setTimeout(() => this.phase.set('idle'), 360);
    }, 240);
  }

  ngOnDestroy(): void {
    if (this.transitionTimer !== undefined) window.clearTimeout(this.transitionTimer);
  }
}
