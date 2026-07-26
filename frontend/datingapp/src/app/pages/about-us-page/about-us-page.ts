import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SignupState } from '../landing/signup-state';

@Component({
  selector: 'app-about-us-page',
  imports: [RouterLink],
  templateUrl: './about-us-page.html',
  styleUrl: './about-us-page.css',
})
export class AboutUsPage {
  protected readonly signup = inject(SignupState);
  protected readonly faqs: ReadonlyArray<{
    question: string;
    answer: string;
    contact?: boolean;
  }> = [
    {
      question: 'Is Rosemarry actually free to use?',
      answer:
        'Yes. Core matching, messaging, and safety features stay free. Paid plans just unlock extras like more likes and boosts.',
    },
    {
      question: 'When is Rosemarry launching?',
      answer:
        'We’re in early access right now. Drop your email in the signup box below and we’ll let you know the moment we’re live.',
    },
    {
      question: 'How is Rosemarry different from other dating apps?',
      answer:
        'No hidden desirability score, no pay-to-win visibility, and no surprise paywalls — just clearer pricing and safer matching.',
    },
    {
      question: 'Is my data safe with Rosemarry?',
      answer:
        'We only use what we need to help you match well, and we never sell your data to third parties.',
    },
    {
      question: 'Still have a question?',
      answer: 'and a real person on the team will get back to you.',
      contact: true,
    },
  ];
  protected readonly activeFaq = signal<number | null>(0);
  protected readonly founderPages = [0, 1] as const;
  protected readonly founderPageCount = this.founderPages.length;
  protected readonly activeFounderPage = signal(0);
  private founderPointerStartX: number | null = null;

  protected toggleFaq(index: number): void {
    this.activeFaq.update((current) => (current === index ? null : index));
  }

  protected previousFounderPage(): void {
    this.activeFounderPage.update(
      (current) => (current - 1 + this.founderPageCount) % this.founderPageCount,
    );
  }

  protected nextFounderPage(): void {
    this.activeFounderPage.update((current) => (current + 1) % this.founderPageCount);
  }

  protected showFounderPage(page: number): void {
    if (page >= 0 && page < this.founderPageCount) {
      this.activeFounderPage.set(page);
    }
  }

  protected onFounderKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previousFounderPage();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextFounderPage();
    }
  }

  protected onFounderPointerDown(event: PointerEvent): void {
    this.founderPointerStartX = event.clientX;
  }

  protected onFounderPointerUp(event: PointerEvent): void {
    if (this.founderPointerStartX === null) {
      return;
    }

    const distance = event.clientX - this.founderPointerStartX;
    this.founderPointerStartX = null;

    if (Math.abs(distance) < 50) {
      return;
    }

    distance > 0 ? this.previousFounderPage() : this.nextFounderPage();
  }

  protected cancelFounderSwipe(): void {
    this.founderPointerStartX = null;
  }
}
