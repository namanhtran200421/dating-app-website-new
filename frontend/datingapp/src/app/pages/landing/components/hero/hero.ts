import { Component, inject, signal } from '@angular/core';
import { SignupState } from '../../signup-state';

interface HeroSlide {
  type: 'discover' | 'chat' | 'safety' | 'plans';
  lead: string;
  emphasis: string;
  body: string;
  offer: string;
  previewLabel: string;
  tabletLabel: string;
  caption: string;
  sticker: string;
}

@Component({
  selector: 'app-landing-hero',
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero {
  protected readonly signup = inject(SignupState);

  protected readonly slides: readonly HeroSlide[] = [
    {
      type: 'discover',
      lead: 'Choose what matters, then meet people',
      emphasis: 'who make more sense.',
      body: 'Preferences, distance, interests and goals shape every match.',
      offer: 'Core matching, chat and safety stay genuinely useful on Free.',
      previewLabel: 'A peek at Discover',
      tabletLabel: 'Rosemarry Discover screen showing a preference-based match on the free plan',
      caption: 'Your preferences, doing the useful work.',
      sticker: 'Free stays useful',
    },
    {
      type: 'chat',
      lead: 'Safer conversations that keep moving',
      emphasis: 'without the ghost-town energy.',
      body: 'Smart moderation checks risky behaviour while AI helps break the ice.',
      offer: 'A 48-hour reply window keeps matches active and intentional.',
      previewLabel: 'A peek inside a chat',
      tabletLabel: 'Rosemarry chat showing an AI opener, safety protection and reply timer',
      caption: 'A little help. A lot less ghosting.',
      sticker: '48h, keep it moving',
    },
    {
      type: 'safety',
      lead: 'Scams, fake profiles and harmful messages',
      emphasis: 'should not get a free pass.',
      body: 'AI-assisted checks spot suspicious patterns before they ruin the experience.',
      offer: 'You stay in control with clear warnings, block tools and simple reporting.',
      previewLabel: 'A peek at Safety Centre',
      tabletLabel:
        'Rosemarry Safety Centre showing a suspicious-link warning and protection status',
      caption: 'Quiet protection. Clear choices.',
      sticker: 'Safety, not surveillance',
    },
    {
      type: 'plans',
      lead: 'Useful dating should not require',
      emphasis: 'a wildly expensive subscription.',
      body: 'Free works properly; Basic and Advanced add more at fair prices.',
      offer: 'A lightweight, photo-first app helps us keep every tier affordable.',
      previewLabel: 'A peek at Plans',
      tabletLabel: 'Rosemarry membership screen showing Free, Basic and Advanced plans',
      caption: 'Fair plans. No feature hostage situation.',
      sticker: 'Built light, priced right',
    },
  ];

  protected readonly activeSlide = signal(0);
  private pointerStartX: number | null = null;

  protected previousSlide(): void {
    this.activeSlide.update((current) => (current - 1 + this.slides.length) % this.slides.length);
  }

  protected nextSlide(): void {
    this.activeSlide.update((current) => (current + 1) % this.slides.length);
  }

  protected goToSlide(index: number): void {
    this.activeSlide.set(index);
  }

  protected onCarouselKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previousSlide();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextSlide();
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    this.pointerStartX = event.clientX;
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.pointerStartX === null) {
      return;
    }

    const distance = event.clientX - this.pointerStartX;
    this.pointerStartX = null;

    if (Math.abs(distance) < 50) {
      return;
    }

    distance > 0 ? this.previousSlide() : this.nextSlide();
  }

  protected cancelPointerGesture(): void {
    this.pointerStartX = null;
  }
}
