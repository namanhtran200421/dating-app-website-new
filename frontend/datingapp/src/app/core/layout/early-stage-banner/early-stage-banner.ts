import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { Router } from '@angular/router';

const DISMISSED_KEY = 'rosemarry-early-stage-dismissed';

@Component({
  selector: 'app-early-stage-banner',
  standalone: true,
  templateUrl: './early-stage-banner.html',
  styleUrl: './early-stage-banner.css',
})
export class EarlyStageBanner {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private previousFocus: HTMLElement | null = null;
  private previousBodyOverflow = '';
  private scrollLocked = false;
  /** True from the first frame on the landing page until the visitor dismisses the notice. */
  private shouldBeOpen = false;

  constructor() {
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) return;

      // Angular's development hydration can reconcile server-rendered attributes after
      // afterNextRender callbacks. Open on the following frame, once reconciliation is complete.
      const openFrame = view.requestAnimationFrame(() => {
        if (!this.isLandingPage() || this.wasDismissed()) return;
        this.previousFocus =
          this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
        this.shouldBeOpen = true;
        this.syncDialog();
      });

      // The dev server's hot reload re-renders this view in place right after bootstrap, which
      // swaps the <dialog> node. Without re-syncing, the opened dialog is removed (invisible)
      // while the scroll lock it set stays on. Re-sync whenever the node changes instead.
      const observer = new MutationObserver(() => this.syncDialog());
      observer.observe(this.host.nativeElement, { childList: true });

      this.destroyRef.onDestroy(() => {
        view.cancelAnimationFrame(openFrame);
        observer.disconnect();
        this.setScrollLock(false);
      });
    });
  }

  protected dismiss(): void {
    this.shouldBeOpen = false;
    this.rememberDismissal();
    const dialog = this.currentDialog();

    if (dialog?.open && typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog?.removeAttribute('open');
    }

    dialog?.classList.remove('early-stage-dialog--fallback');
    this.release();
  }

  protected handleCancel(event: Event): void {
    event.preventDefault();
    this.dismiss();
  }

  protected handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.dismiss();
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const dialog = event.currentTarget as HTMLDialogElement;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled])'));
    if (controls.length === 0) return;

    const first = controls[0];
    const last = controls.at(-1);
    const activeElement = this.document.activeElement;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected handleClose(): void {
    this.shouldBeOpen = false;
    this.rememberDismissal();
    this.release();
  }

  /** Make the live <dialog> match `shouldBeOpen`, and lock scrolling only while it is open. */
  private syncDialog(): void {
    const dialog = this.currentDialog();
    if (dialog && this.shouldBeOpen && !dialog.open) this.showDialog(dialog);
    this.setScrollLock(Boolean(dialog?.open));
  }

  private showDialog(dialog: HTMLDialogElement): void {
    dialog.classList.remove('early-stage-dialog--fallback');

    try {
      if (typeof dialog.showModal !== 'function') throw new Error('Dialog API unavailable');
      dialog.showModal();
    } catch {
      // Keep the notice viewport-fixed in browsers and embedded previews without showModal().
      dialog.classList.add('early-stage-dialog--fallback');
      dialog.setAttribute('open', '');
    }

    queueMicrotask(() =>
      dialog.querySelector<HTMLButtonElement>('.early-stage-card__action')?.focus(),
    );
  }

  /** Only finds the dialog currently attached to this component, never a replaced one. */
  private currentDialog(): HTMLDialogElement | null {
    return this.host.nativeElement.querySelector('dialog');
  }

  private setScrollLock(locked: boolean): void {
    if (locked === this.scrollLocked) return;

    if (locked) {
      this.previousBodyOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';
    } else {
      this.document.body.style.overflow = this.previousBodyOverflow;
    }

    this.scrollLocked = locked;
  }

  private release(): void {
    this.setScrollLock(false);

    const previousFocus = this.previousFocus;
    this.previousFocus = null;
    if (
      previousFocus &&
      previousFocus !== this.document.body &&
      this.document.contains(previousFocus)
    ) {
      previousFocus.focus();
    }
  }

  private wasDismissed(): boolean {
    try {
      return this.document.defaultView?.sessionStorage.getItem(DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private isLandingPage(): boolean {
    const [path] = this.router.url.split(/[?#]/);
    return path === '/';
  }

  private rememberDismissal(): void {
    try {
      this.document.defaultView?.sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // Closing the dialog still works when browser storage is unavailable.
    }
  }
}
