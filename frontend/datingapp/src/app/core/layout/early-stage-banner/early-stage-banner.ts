import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  inject,
} from '@angular/core';

const DISMISSED_KEY = 'rosemarry-early-stage-dismissed';

@Component({
  selector: 'app-early-stage-banner',
  standalone: true,
  templateUrl: './early-stage-banner.html',
  styleUrl: './early-stage-banner.css',
})
export class EarlyStageBanner implements OnDestroy {
  @ViewChild('noticeDialog', { static: true })
  private readonly noticeDialog!: ElementRef<HTMLDialogElement>;

  @ViewChild('primaryAction', { static: true })
  private readonly primaryAction!: ElementRef<HTMLButtonElement>;

  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private previousFocus: HTMLElement | null = null;
  private previousBodyOverflow = '';
  private scrollLocked = false;
  private openFrame: number | null = null;

  constructor() {
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) return;

      // Angular's development hydration can reconcile server-rendered attributes after
      // afterNextRender callbacks. Open on the following frame, once reconciliation is complete.
      this.openFrame = view.requestAnimationFrame(() => {
        this.openFrame = null;
        if (this.destroyRef.destroyed || this.wasDismissed()) return;
        this.open();
      });
    });
  }

  protected dismiss(): void {
    this.rememberDismissal();
    const dialog = this.noticeDialog.nativeElement;

    if (dialog.open && typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }

    dialog.classList.remove('early-stage-dialog--fallback');
    this.releaseModalState();
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

    const controls = Array.from(
      this.noticeDialog.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled])'),
    );
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
    this.rememberDismissal();
    this.releaseModalState();
  }

  ngOnDestroy(): void {
    if (this.openFrame !== null) {
      this.document.defaultView?.cancelAnimationFrame(this.openFrame);
      this.openFrame = null;
    }
    this.releaseModalState(false);
  }

  private open(): void {
    const dialog = this.noticeDialog.nativeElement;
    this.previousFocus =
      this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
    dialog.classList.remove('early-stage-dialog--fallback');

    try {
      if (typeof dialog.showModal !== 'function') throw new Error('Dialog API unavailable');
      dialog.showModal();
    } catch {
      // Keep the notice viewport-fixed in browsers and embedded previews without showModal().
      dialog.classList.add('early-stage-dialog--fallback');
      dialog.setAttribute('open', '');
    }

    if (!dialog.open) return;

    this.previousBodyOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    this.scrollLocked = true;
    queueMicrotask(() => this.primaryAction.nativeElement.focus());
  }

  private releaseModalState(restoreFocus = true): void {
    if (!this.scrollLocked) return;
    this.document.body.style.overflow = this.previousBodyOverflow;
    this.scrollLocked = false;

    if (
      restoreFocus &&
      this.previousFocus &&
      this.previousFocus !== this.document.body &&
      this.document.contains(this.previousFocus)
    ) {
      this.previousFocus.focus();
    }
  }

  private wasDismissed(): boolean {
    try {
      return this.document.defaultView?.sessionStorage.getItem(DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private rememberDismissal(): void {
    try {
      this.document.defaultView?.sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // Closing the dialog still works when browser storage is unavailable.
    }
  }
}
