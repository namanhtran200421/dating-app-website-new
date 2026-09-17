import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';

type DemoScreen = 'interests' | 'goal' | 'done';

/** Step 1 of "How it works": a small, self-contained taste of onboarding. */
@Component({
  selector: 'app-interests-demo',
  templateUrl: './interests-demo.html',
  styleUrls: ['../demo-card.css', './interests-demo.css'],
})
export class InterestsDemo {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly maxInterests = 5;

  // Icon classes are spelled out in full so scripts/generate-icons.mjs can find them.
  protected readonly interests: ReadonlyArray<{ label: string; icon: string }> = [
    { label: 'Photography', icon: 'fa-solid fa-camera' },
    { label: 'Shopping', icon: 'fa-solid fa-bag-shopping' },
    { label: 'Karaoke', icon: 'fa-solid fa-microphone' },
    { label: 'Yoga', icon: 'fa-solid fa-spa' },
    { label: 'Cooking', icon: 'fa-solid fa-utensils' },
    { label: 'Tennis', icon: 'fa-solid fa-table-tennis-paddle-ball' },
    { label: 'Running', icon: 'fa-solid fa-person-running' },
    { label: 'Swimming', icon: 'fa-solid fa-person-swimming' },
    { label: 'Art', icon: 'fa-solid fa-palette' },
    { label: 'Traveling', icon: 'fa-solid fa-plane' },
    { label: 'Extreme', icon: 'fa-solid fa-mountain' },
    { label: 'Music', icon: 'fa-solid fa-music' },
    { label: 'Drinks', icon: 'fa-solid fa-martini-glass' },
    { label: 'Video games', icon: 'fa-solid fa-gamepad' },
  ];

  protected readonly goals: ReadonlyArray<{ label: string; hint: string; icon: string }> = [
    { label: 'Long-term relationship', hint: 'Someone to build with', icon: 'fa-solid fa-heart' },
    {
      label: 'Short-term relationship',
      hint: 'See where it goes',
      icon: 'fa-solid fa-hourglass-half',
    },
    { label: 'Casual dating', hint: 'Keep it light and easy', icon: 'fa-solid fa-mug-hot' },
    { label: 'New friends', hint: 'People to hang out with', icon: 'fa-solid fa-user-group' },
    { label: 'Not sure yet', hint: 'Figuring it out as I go', icon: 'fa-solid fa-circle-question' },
  ];

  protected readonly screen = signal<DemoScreen>('interests');
  protected readonly goingBack = signal(false);
  protected readonly picked = signal<readonly string[]>([]);
  protected readonly goal = signal<string | null>(null);
  protected readonly isFull = computed(() => this.picked().length >= this.maxInterests);

  protected isPicked(label: string): boolean {
    return this.picked().includes(label);
  }

  protected toggleInterest(label: string): void {
    this.picked.update((current) => {
      if (current.includes(label)) return current.filter((item) => item !== label);
      return current.length < this.maxInterests ? [...current, label] : current;
    });
  }

  protected next(): void {
    if (this.picked().length > 0) this.go('goal');
  }

  protected back(): void {
    this.go('interests', true);
  }

  protected finish(): void {
    if (this.goal()) this.go('done');
  }

  protected restart(): void {
    this.picked.set([]);
    this.goal.set(null);
    this.go('interests', true);
  }

  /** Swap screens and move focus to the new title so keyboard users aren't dropped on <body>. */
  private go(screen: DemoScreen, back = false): void {
    this.goingBack.set(back);
    this.screen.set(screen);
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLElement>('.demo-title')
          ?.focus({ preventScroll: true }),
      { injector: this.injector },
    );
  }
}
