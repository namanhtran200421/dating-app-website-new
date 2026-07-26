import {
  AfterViewInit,
  Directive,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const REVEAL_SELECTOR = '[data-motion-reveal]';

@Directive({
  selector: '[appScrollReveal]',
})
export class ScrollReveal implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cleanups = new Map<HTMLElement, VoidFunction>();
  private mutationObserver?: MutationObserver;
  private syncQueued = false;

  ngAfterViewInit(): void {
    if (
      !isPlatformBrowser(this.platformId) ||
      typeof window.matchMedia !== 'function' ||
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    this.syncElements();
    this.mutationObserver = new MutationObserver(() => this.queueSync());
    this.mutationObserver.observe(this.host.nativeElement, {
      childList: true,
      subtree: true,
    });
  }

  ngOnDestroy(): void {
    this.mutationObserver?.disconnect();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups.clear();
  }

  private queueSync(): void {
    if (this.syncQueued) {
      return;
    }

    this.syncQueued = true;
    queueMicrotask(() => {
      this.syncQueued = false;
      this.syncElements();
    });
  }

  private syncElements(): void {
    const currentElements = new Set(
      this.host.nativeElement.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
    );

    this.cleanups.forEach((cleanup, element) => {
      if (!currentElements.has(element)) {
        cleanup();
        this.cleanups.delete(element);
      }
    });

    currentElements.forEach((element) => {
      if (!this.cleanups.has(element)) {
        this.cleanups.set(element, this.observeElement(element));
      }
    });
  }

  private observeElement(element: HTMLElement): VoidFunction {
    const fadeOnly = element.dataset['motionReveal'] === 'fade';
    const delay = Number(element.dataset['motionDelay'] ?? 0);
    let animation: Animation | undefined;

    element.style.opacity = '0';
    element.style.willChange = fadeOnly ? 'opacity' : 'opacity, transform';

    if (!fadeOnly) {
      element.style.transform = 'translate3d(0, 22px, 0)';
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        observer.disconnect();
        animation?.cancel();
        animation = element.animate(
          fadeOnly
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [
                { opacity: 0, transform: 'translate3d(0, 22px, 0)' },
                { opacity: 1, transform: 'translate3d(0, 0, 0)' },
              ],
          {
            duration: 620,
            delay: delay * 1000,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards',
          },
        );

        void animation.finished
          .then(() => {
            element.style.opacity = '1';
            element.style.transform = 'none';
            element.style.removeProperty('will-change');
          })
          .catch(() => undefined);
      },
      {
        rootMargin: '0px 0px -6% 0px',
        threshold: 0.12,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      animation?.cancel();
      element.style.removeProperty('opacity');
      element.style.removeProperty('transform');
      element.style.removeProperty('will-change');
    };
  }
}
