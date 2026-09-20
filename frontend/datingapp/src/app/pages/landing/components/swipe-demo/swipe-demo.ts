import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { ResponsiveImage, responsiveImage } from '../../../../shared/images/responsive-image';

@Component({
  selector: 'app-swipe-demo',
  templateUrl: './swipe-demo.html',
  styleUrl: './swipe-demo.css',
})
export class SwipeDemo implements AfterViewInit, OnDestroy {
  private static readonly PROFILE_WIDTHS = [240, 360, 560];

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly profileSizes = '(max-width: 560px) 76vw, 320px';
  protected readonly profiles: ReadonlyArray<SwipeProfile> = [
    {
      name: 'Elena',
      age: 28,
      bio: 'Reads two books at once, finishes neither.',
      photo: responsiveImage('rosemarry/profile-elena', SwipeDemo.PROFILE_WIDTHS),
    },
    {
      name: 'Priya',
      age: 26,
      bio: 'Runs on iced coffee and very long walks.',
      photo: responsiveImage('rosemarry/profile-priya', SwipeDemo.PROFILE_WIDTHS),
    },
    {
      name: 'Daniel',
      age: 24,
      bio: 'Plays bass badly, cooks extremely well.',
      photo: responsiveImage('rosemarry/profile-daniel', SwipeDemo.PROFILE_WIDTHS),
    },
    {
      name: 'Mia',
      age: 27,
      bio: 'Ceramics class dropout. Unbeatable at mini golf.',
      photo: responsiveImage('rosemarry/profile-mia-original', SwipeDemo.PROFILE_WIDTHS),
    },
    {
      name: 'Andy',
      age: 23,
      bio: 'Climbing gym regular, terrible at resting.',
      photo: responsiveImage('rosemarry/profile-steve-candid', SwipeDemo.PROFILE_WIDTHS),
    },
    {
      name: 'Asha',
      age: 25,
      bio: "Sunday markets, bad puns, other people's dogs.",
      photo: responsiveImage('rosemarry/profile-asha-original', SwipeDemo.PROFILE_WIDTHS),
    },
    {
      name: 'Jonah',
      age: 30,
      bio: 'Will drive two hours for a decent taco.',
      photo: responsiveImage('rosemarry/profile-jonah-original', SwipeDemo.PROFILE_WIDTHS),
    },
  ];

  protected readonly slots = signal<ReadonlyArray<SwipeSlot>>([
    { slot: 0, profileIndex: 0, phase: 'idle' },
  ]);
  protected readonly announcement = signal('');

  private nextProfileIndex = 1;
  private nextAutomaticChoice: SwipeChoice = 'pass';
  private automaticChoicesStarted = false;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly startChoicesAfterNotice = () => this.startAutomaticChoices();

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const view = this.document.defaultView;
    if (!view) return;

    view.addEventListener('rosemarry:early-stage-dismissed', this.startChoicesAfterNotice);

    try {
      if (view.sessionStorage.getItem('rosemarry-early-stage-dismissed') === 'true') {
        this.startAutomaticChoices();
      }
    } catch {
      // The notice dispatches the dismissal event even when session storage is unavailable.
    }
  }

  protected chooseProfile(choice: SwipeChoice, announceChoice = true): void {
    const selectedSlot = this.slots()[0];
    if (!selectedSlot || selectedSlot.phase !== 'idle') return;

    const selectedProfile = this.profiles[selectedSlot.profileIndex];
    if (announceChoice) {
      this.announcement.set(
        choice === 'like'
          ? `You liked ${selectedProfile.name}.`
          : `You passed on ${selectedProfile.name}.`,
      );
    }

    this.updateSlot({ phase: choice === 'like' ? 'liking' : 'passing' });

    this.schedule(() => {
      this.updateSlot({ profileIndex: this.takeNextProfile(), phase: 'entering' });
      this.schedule(() => this.updateSlot({ phase: 'idle' }), 500);
    }, 520);
  }

  private startAutomaticChoices(): void {
    if (this.automaticChoicesStarted) return;
    this.automaticChoicesStarted = true;
    this.scheduleAutomaticChoice(1400);
  }

  private scheduleAutomaticChoice(delay = 1800): void {
    this.schedule(() => {
      const choice = this.nextAutomaticChoice;
      this.chooseProfile(choice, false);
      this.nextAutomaticChoice = choice === 'pass' ? 'like' : 'pass';
      this.scheduleAutomaticChoice();
    }, delay);
  }

  private takeNextProfile(): number {
    const candidate = this.nextProfileIndex;
    this.nextProfileIndex = (candidate + 1) % this.profiles.length;
    return candidate;
  }

  private updateSlot(update: Partial<SwipeSlot>): void {
    this.slots.update(([slot]) => [{ ...slot, ...update }]);
  }

  private schedule(update: () => void, delay: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      update();
    }, delay);
    this.timers.add(timer);
  }

  ngOnDestroy(): void {
    this.document.defaultView?.removeEventListener(
      'rosemarry:early-stage-dismissed',
      this.startChoicesAfterNotice,
    );
    this.timers.forEach((timer) => clearTimeout(timer));
  }
}

interface SwipeProfile {
  readonly name: string;
  readonly age: number;
  readonly bio: string;
  readonly photo: ResponsiveImage;
}

type SwipeChoice = 'pass' | 'like';
type SwipePhase = 'idle' | 'passing' | 'liking' | 'entering';

interface SwipeSlot {
  readonly slot: number;
  readonly profileIndex: number;
  readonly phase: SwipePhase;
}
