import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-faq',
  imports: [RouterLink],
  templateUrl: './faq.html',
  styleUrl: './faq.css',
})
export class HomeFaq {
  protected readonly faqs: ReadonlyArray<{
    question: string;
    answer: string;
    contact?: boolean;
  }> = [
    {
      question: 'How do weekly Circles work?',
      answer:
        'Each week, Rosemarry brings together a Circle of 10 nearby singles based on shared interests for six days. You can get to know each other through prompts, shared activities and group conversations before deciding whether there is a connection.',
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
      question: 'How does the AI matching work?',
      answer:
        'Your first Circle is based on nearby singles who share your interests. As you chat, join activities and build connections, Rosemarry’s AI learns from those interactions to help find more compatible matches over time. You always decide who you match with.',
    },
    {
      question: 'What happens when the week ends?',
      answer:
        'Your Circle ends and a new one begins. What Rosemarry’s AI learns from your interactions helps shape future Circles, and people who appear more compatible may be brought together again.',
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
  protected readonly activeFaq = signal<number | null>(null);

  protected toggleFaq(index: number): void {
    this.activeFaq.update((current) => (current === index ? null : index));
  }
}
