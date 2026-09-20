import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivitiesDemo } from './components/activities-demo/activities-demo';
import { CircleDemo } from './components/circle-demo/circle-demo';
import { HomeFaq } from './components/faq/faq';
import { InterestsDemo } from './components/interests-demo/interests-demo';
import { MembersDemo } from './components/members-demo/members-demo';
import { SignupState } from './signup-state';

@Component({
  selector: 'app-landing',
  imports: [ActivitiesDemo, CircleDemo, HomeFaq, InterestsDemo, MembersDemo],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css', '../../../landing-steps.css'],
})
export class Landing implements AfterViewInit, OnDestroy {
  protected readonly signup = inject(SignupState);

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly swipeProfiles = [
    {
      name: 'Elena',
      age: 28,
      bio: 'Reads two books at once, finishes neither.',
      image: '/images/rosemarry/profile-elena.jpg',
    },
    {
      name: 'Priya',
      age: 26,
      bio: 'Runs on iced coffee and very long walks.',
      image: '/images/rosemarry/profile-priya.jpg',
    },
    {
      name: 'Daniel',
      age: 24,
      bio: 'Plays bass badly, cooks extremely well.',
      image: '/images/rosemarry/profile-daniel.jpg',
    },
    {
      name: 'Mia',
      age: 27,
      bio: 'Ceramics class dropout. Unbeatable at mini golf.',
      image: '/images/rosemarry/profile-mia-original.jpg',
    },
    {
      name: 'Steve',
      age: 23,
      bio: 'Climbing gym regular, terrible at resting.',
      image: '/images/rosemarry/profile-steve-candid.jpg',
    },
    {
      name: 'Asha',
      age: 25,
      bio: "Sunday markets, bad puns, other people's dogs.",
      image: '/images/rosemarry/profile-asha-original.jpg',
    },
    {
      name: 'Jonah',
      age: 30,
      bio: 'Will drive two hours for a decent taco.',
      image: '/images/rosemarry/profile-jonah-original.jpg',
    },
  ] as const;

  protected readonly swipeSlots = signal<ReadonlyArray<SwipeSlot>>(
    this.swipeProfiles.slice(0, 4).map((_, slot) => ({ slot, profileIndex: slot, phase: 'idle' })),
  );

  protected swipeAnnouncement = signal('');

  private nextProfileIndex = 4;
  private previousAutomaticSlot: number | null = null;
  private nextAutomaticChoice: SwipeChoice = 'pass';
  private automaticChoicesStarted = false;
  private readonly swipeTimers = new Set<ReturnType<typeof setTimeout>>();
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

  private startAutomaticChoices(): void {
    if (this.automaticChoicesStarted) return;
    this.automaticChoicesStarted = true;
    this.scheduleAutomaticChoice(800);
  }

  protected chooseProfile(slotNumber: number, choice: SwipeChoice, announceChoice = true): void {
    const selectedSlot = this.swipeSlots().find((slot) => slot.slot === slotNumber);

    if (!selectedSlot || selectedSlot.phase !== 'idle') {
      return;
    }

    const selectedProfile = this.swipeProfiles[selectedSlot.profileIndex];
    if (announceChoice) {
      this.swipeAnnouncement.set(
        choice === 'like'
          ? `You liked ${selectedProfile.name}.`
          : `You passed on ${selectedProfile.name}.`,
      );
    }
    this.updateSwipeSlot(slotNumber, { phase: choice === 'like' ? 'liking' : 'passing' });

    this.scheduleSwipeUpdate(() => {
      const replacementIndex = this.takeNextAvailableProfile(slotNumber);
      this.updateSwipeSlot(slotNumber, { profileIndex: replacementIndex, phase: 'entering' });

      this.scheduleSwipeUpdate(() => {
        this.updateSwipeSlot(slotNumber, { phase: 'idle' });
      }, 520);
    }, 460);
  }

  private scheduleAutomaticChoice(delay = 1100): void {
    this.scheduleSwipeUpdate(() => {
      const slotNumber = this.pickRandomAutomaticSlot();
      const choice = this.nextAutomaticChoice;

      if (slotNumber !== null) {
        this.chooseProfile(slotNumber, choice, false);
        this.previousAutomaticSlot = slotNumber;
        this.nextAutomaticChoice = choice === 'pass' ? 'like' : 'pass';
      }

      this.scheduleAutomaticChoice();
    }, delay);
  }

  private pickRandomAutomaticSlot(): number | null {
    const idleSlots = this.swipeSlots().filter((slot) => slot.phase === 'idle');
    const differentSlots = idleSlots.filter((slot) => slot.slot !== this.previousAutomaticSlot);
    const candidates = differentSlots.length > 0 ? differentSlots : idleSlots;

    if (candidates.length === 0) return null;

    return candidates[Math.floor(Math.random() * candidates.length)].slot;
  }

  private takeNextAvailableProfile(slotNumber: number): number {
    const occupiedProfiles = new Set(
      this.swipeSlots()
        .filter((slot) => slot.slot !== slotNumber)
        .map((slot) => slot.profileIndex),
    );

    for (let offset = 0; offset < this.swipeProfiles.length; offset += 1) {
      const candidate = (this.nextProfileIndex + offset) % this.swipeProfiles.length;

      if (!occupiedProfiles.has(candidate)) {
        this.nextProfileIndex = (candidate + 1) % this.swipeProfiles.length;
        return candidate;
      }
    }

    return this.nextProfileIndex;
  }

  private updateSwipeSlot(slotNumber: number, update: Partial<SwipeSlot>): void {
    this.swipeSlots.update((slots) =>
      slots.map((slot) => (slot.slot === slotNumber ? { ...slot, ...update } : slot)),
    );
  }

  private scheduleSwipeUpdate(update: () => void, delay: number): void {
    const timer = setTimeout(() => {
      this.swipeTimers.delete(timer);
      update();
    }, delay);
    this.swipeTimers.add(timer);
  }

  ngOnDestroy(): void {
    this.document.defaultView?.removeEventListener(
      'rosemarry:early-stage-dismissed',
      this.startChoicesAfterNotice,
    );
    this.swipeTimers.forEach((timer) => clearTimeout(timer));
  }

  /** Scrolls to a "How it works" step and moves focus there so keyboard users follow along. */
  protected goToStep(step: HTMLElement, title: HTMLElement): void {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    step.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    title.focus({ preventScroll: true });
  }
}

type SwipeChoice = 'pass' | 'like';
type SwipePhase = 'idle' | 'passing' | 'liking' | 'entering';

interface SwipeSlot {
  readonly slot: number;
  readonly profileIndex: number;
  readonly phase: SwipePhase;
}
