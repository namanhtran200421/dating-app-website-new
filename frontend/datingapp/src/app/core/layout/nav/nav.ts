import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { SignupState } from '../../../pages/landing/signup-state';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class Nav {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly signup = inject(SignupState);
  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly desktopMenuOpen = signal(false);
  protected readonly navHidden = signal(false);
  /** "How it works" is a section on the home page, not a route, so it is highlighted while in view. */
  protected readonly howItWorksActive = signal(false);
  private readonly companyMenuTrigger =
    viewChild<ElementRef<HTMLButtonElement>>('companyMenuTrigger');
  private lastScrollY = 0;
  private scrollDirection: -1 | 0 | 1 = 0;
  private directionalTravel = 0;
  private scrollFrame = 0;
  private sectionObserver?: IntersectionObserver;
  readonly darkBackground = input(false);

  constructor() {
    // The section check reads the DOM and window, so it only runs in the browser, never during SSR.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }

    /*
     * A passive listener, coalesced to one frame, so scrolling is never held up waiting for this
     * handler and the nav state is recomputed at most once per painted frame.
     */
    const onScroll = () => {
      if (this.scrollFrame) return;
      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = 0;
        this.updateScrollState();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => requestAnimationFrame(() => this.watchHowItWorksSection()));
    requestAnimationFrame(() => this.watchHowItWorksSection());

    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(this.scrollFrame);
      this.sectionObserver?.disconnect();
    });
  }

  private updateScrollState(): void {
    const currentScrollY = Math.max(window.scrollY, 0);
    const delta = currentScrollY - this.lastScrollY;
    this.lastScrollY = currentScrollY;
    this.scrolled.set(currentScrollY > 24);

    if (currentScrollY < 120) {
      this.showNavigation();
      this.resetScrollIntent();
      return;
    }

    if (Math.abs(delta) < 1) {
      return;
    }

    const direction: -1 | 1 = delta > 0 ? 1 : -1;
    if (direction !== this.scrollDirection) {
      this.scrollDirection = direction;
      this.directionalTravel = 0;
    }
    this.directionalTravel += Math.abs(delta);

    if (direction === -1 && this.directionalTravel >= 18) {
      this.showNavigation();
      return;
    }

    if (
      direction === 1 &&
      this.directionalTravel >= 40 &&
      !this.menuOpen() &&
      !this.desktopMenuOpen() &&
      !this.element.nativeElement.contains(document.activeElement)
    ) {
      this.navHidden.set(true);
    }
  }

  @HostListener('focusin')
  onFocusIn(): void {
    this.showNavigation();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    const restoreDesktopFocus = this.desktopMenuOpen();
    this.closeMenu();

    if (restoreDesktopFocus) {
      this.companyMenuTrigger()?.nativeElement.focus();
    }
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
    this.desktopMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      (this.menuOpen() || this.desktopMenuOpen()) &&
      !this.element.nativeElement.contains(event.target as Node)
    ) {
      this.closeMenu();
    }
  }

  protected toggleMenu(): void {
    this.showNavigation();
    this.desktopMenuOpen.set(false);
    this.menuOpen.update((open) => !open);
  }

  protected toggleDesktopMenu(): void {
    this.showNavigation();
    this.menuOpen.set(false);
    this.desktopMenuOpen.update((open) => !open);
  }

  /**
   * Highlights "How it works" while the section crosses the reading line at 40% of the viewport.
   *
   * This used to be a `getBoundingClientRect()` on every scroll event, which forces the browser to
   * lay the page out again mid-scroll. A zero-height root margin band at the same 40% line asks
   * the browser the identical question and costs nothing while scrolling.
   */
  private watchHowItWorksSection(): void {
    this.sectionObserver?.disconnect();
    this.sectionObserver = undefined;

    const section = document.getElementById('how-it-works');
    if (!section || typeof IntersectionObserver === 'undefined') {
      this.howItWorksActive.set(false);
      return;
    }

    this.sectionObserver = new IntersectionObserver(
      ([entry]) => this.howItWorksActive.set(entry?.isIntersecting ?? false),
      { rootMargin: '-40% 0px -60% 0px', threshold: 0 },
    );
    this.sectionObserver.observe(section);
  }

  private showNavigation(): void {
    this.navHidden.set(false);
  }

  private resetScrollIntent(): void {
    this.scrollDirection = 0;
    this.directionalTravel = 0;
  }
}
