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
      question: 'How do weekly Circles work?',
      answer:
        'Each week, Rosemarry brings together a small group of compatible people nearby. You can get to know each other through prompts, shared activities and group conversations before deciding whether there is a connection.',
    },
    {
      question: 'Do I have to decide from a profile first?',
      answer:
        'No. Profiles provide context, but Rosemarry gives you time to interact first. If you become interested in someone, you can choose to match with them at any point during the week.',
    },
    {
      question: 'Why focus on repeated interactions?',
      answer:
        'Attraction is not always instant. Familiarity, shared moments and repeated conversations let personality, humour and chemistry emerge in a way that a single profile impression often cannot.',
    },
    {
      question: 'What happens when the week ends?',
      answer:
        'Your Circle ends and a new one begins. What Rosemarry learns from how the group connected helps shape future Circles, and people with strong compatibility may be brought together again.',
    },
    {
      question: 'Is Rosemarry actually free to use?',
      answer:
        'Yes. Weekly Circles, shared activities, group conversations and the freedom to match remain free. Paid plans offer extra insight and more control over future Circles.',
    },
    {
      question: 'Still have a question?',
      answer: 'and a real person on the team will get back to you.',
      contact: true,
    },
  ];
  protected readonly activeFaq = signal<number | null>(0);

  protected toggleFaq(index: number): void {
    this.activeFaq.update((current) => (current === index ? null : index));
  }
}
