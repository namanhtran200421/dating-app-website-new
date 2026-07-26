import {
  AfterViewInit,
  Directive,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { inView } from 'motion';
import { animate } from 'motion/mini';

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
    const restingTransform = fadeOnly ? 'none' : 'translateY(22px)';
    const delay = Number(element.dataset['motionDelay'] ?? 0);
    let animation: ReturnType<typeof animate> | undefined;

    element.style.opacity = '0';
    element.style.willChange = fadeOnly ? 'opacity' : 'opacity, transform';

    if (!fadeOnly) {
      element.style.transform = restingTransform;
    }

    let stopObserving: VoidFunction = () => undefined;

    stopObserving = inView(
      element,
      () => {
        animation?.stop();
        animation = fadeOnly
          ? animate(
              element,
              { opacity: [0, 1] },
              {
                duration: 0.62,
                delay,
                ease: [0.22, 1, 0.36, 1],
              },
            )
          : animate(
              element,
              {
                opacity: [0, 1],
                transform: [restingTransform, 'none'],
              },
              {
                duration: 0.62,
                delay,
                ease: [0.22, 1, 0.36, 1],
              },
            );

        stopObserving();
      },
      {
        amount: element.offsetHeight > window.innerHeight * 1.35 ? 'some' : 0.18,
        margin: '0px 0px -6% 0px',
      },
    );

    return () => {
      stopObserving();
      animation?.stop();
      element.style.removeProperty('opacity');
      element.style.removeProperty('transform');
      element.style.removeProperty('will-change');
    };
  }
}
