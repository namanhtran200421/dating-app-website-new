import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { ResponsiveImage, responsiveImage } from '../../../../shared/images/responsive-image';

@Component({
  selector: 'app-swipe-demo',
  templateUrl: './swipe-demo.html',
  styleUrl: './swipe-demo.css',
})
export class SwipeDemo implements AfterViewInit, OnDestroy {
  private static readonly PROFILE_WIDTHS = [240, 360, 560];
  private static readonly SWIPE_DURATION = 1000;

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
    { slot: 0, profileIndex: 0, phase: 'idle', position: 'active' },
    { slot: 1, profileIndex: 1, phase: 'idle', position: 'queued' },
  ]);
  protected readonly announcement = signal('');

  private nextProfileIndex = 2;
  private automaticChoicesStarted = false;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.startAutomaticChoices();
  }

  protected chooseProfile(choice: SwipeChoice, announceChoice = true): void {
    const selectedSlot = this.slots().find((slot) => slot.position === 'active');
    if (!selectedSlot || selectedSlot.phase !== 'idle') return;

    const queuedSlot = this.slots().find((slot) => slot.position === 'queued');
    if (!queuedSlot) return;

    const selectedProfile = this.profiles[selectedSlot.profileIndex];
    if (announceChoice) {
      this.announcement.set(
        choice === 'like'
          ? `You liked ${selectedProfile.name}.`
          : `You passed on ${selectedProfile.name}.`,
      );
    }

    this.slots.update((slots) =>
      slots.map((slot) =>
        slot.position === 'active'
          ? { ...slot, phase: choice === 'like' ? 'liking' : 'passing' }
          : { ...slot, phase: 'revealing' },
      ),
    );

    this.schedule(() => {
      this.slots.set([
        { ...queuedSlot, phase: 'idle', position: 'active' },
        {
          ...selectedSlot,
          profileIndex: this.takeNextProfile(),
          phase: 'idle',
          position: 'queued',
        },
      ]);
    }, SwipeDemo.SWIPE_DURATION);
  }

  private startAutomaticChoices(): void {
    if (this.automaticChoicesStarted) return;
    this.automaticChoicesStarted = true;
    this.scheduleAutomaticChoice(650);
  }

  private scheduleAutomaticChoice(delay = 2300): void {
    this.schedule(() => {
      const choice: SwipeChoice = Math.random() < 0.5 ? 'pass' : 'like';
      this.chooseProfile(choice, false);
      this.scheduleAutomaticChoice();
    }, delay);
  }

  private takeNextProfile(): number {
    const candidate = this.nextProfileIndex;
    this.nextProfileIndex = (candidate + 1) % this.profiles.length;
    return candidate;
  }

  private schedule(update: () => void, delay: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      update();
    }, delay);
    this.timers.add(timer);
  }

  ngOnDestroy(): void {
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
type SwipePhase = 'idle' | 'passing' | 'liking' | 'revealing';
type SwipePosition = 'active' | 'queued';

interface SwipeSlot {
  readonly slot: number;
  readonly profileIndex: number;
  readonly phase: SwipePhase;
  readonly position: SwipePosition;
}
