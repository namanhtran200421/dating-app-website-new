import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
  viewChild,
} from '@angular/core';

const DISMISSED_KEY = 'rosemarry-early-stage-dismissed';
const CLOSE_ANIMATION_MS = 540;

@Component({
  selector: 'app-early-stage-banner',
  standalone: true,
  imports: [],
  templateUrl: './early-stage-banner.html',
  styleUrl: './early-stage-banner.css',
})
export class EarlyStageBanner implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly primaryAction = viewChild<ElementRef<HTMLButtonElement>>('primaryAction');
  private previousBodyOverflow = '';
  private closeTimer?: ReturnType<typeof setTimeout>;
  protected readonly visible = signal(true);
  protected readonly closing = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      this.visible.set(sessionStorage.getItem(DISMISSED_KEY) !== 'true');
    } catch {
      this.visible.set(true);
    }

    if (this.visible()) {
      this.previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
  }

  ngAfterViewInit(): void {
    if (this.visible()) {
      queueMicrotask(() => this.primaryAction()?.nativeElement.focus());
    }
  }

  ngOnDestroy(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
    }

    this.restorePageScroll();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.visible()) {
      this.dismiss();
    }
  }

  protected dismiss(): void {
    if (!this.visible() || this.closing()) {
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      try {
        sessionStorage.setItem(DISMISSED_KEY, 'true');
      } catch {
        // The modal can still be dismissed when storage is unavailable.
      }
    }

    if (this.prefersReducedMotion()) {
      this.finishDismissal();
      return;
    }

    this.closing.set(true);
    this.closeTimer = setTimeout(() => this.finishDismissal(), CLOSE_ANIMATION_MS);
  }

  private restorePageScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = this.previousBodyOverflow;
    }
  }

  private finishDismissal(): void {
    this.visible.set(false);
    this.closing.set(false);
    this.closeTimer = undefined;
    this.restorePageScroll();
  }

  private prefersReducedMotion(): boolean {
    return (
      isPlatformBrowser(this.platformId) &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
