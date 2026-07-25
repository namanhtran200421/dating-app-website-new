import { Component, inject, signal } from '@angular/core';
import { SignupState } from '../../signup-state';
import { ImagePlaceholder } from '../image-placeholder/image-placeholder';

interface HeroSlide {
  eyebrow?: string;
  lead: string;
  emphasis: string;
  body: string;
  offer: string;
  imageLabel: string;
}

@Component({
  selector: 'app-landing-hero',
  imports: [ImagePlaceholder],
  templateUrl: './hero.html',
})
export class Hero {
  protected readonly signup = inject(SignupState);

  protected readonly slides: readonly HeroSlide[] = [
    {
      lead: 'Rosemarry aims to make online dating',
      emphasis: 'cheaper and easier.',
      body: 'No expensive paywalls or cash-grabbing features.',
      offer: 'Get in early and score one month of Advanced for free. Major W.',
      imageLabel: 'Main-character moment — two people actually vibing',
    },
    {
      lead: 'Meet people you actually want to know',
      emphasis: 'without losing your whole day.',
      body: 'Better matching make every conversation exciting!',
      offer: 'Your time is important. We help you spend it well.',
      imageLabel: 'A first date that feels easy, warm and genuinely fun',
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
