import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PreSignupService } from '../../services/pre-signup.service';
import { TurnstileWidget } from '../../shared/turnstile/turnstile-widget';

type ActionMode = 'verify' | 'unsubscribe';
type ActionStatus = 'ready' | 'working' | 'success' | 'error';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-subscription-action',
  imports: [ReactiveFormsModule, RouterLink, TurnstileWidget],
  templateUrl: './subscription-action.html',
  styleUrl: './subscription-action.css',
})
export class SubscriptionActionPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(PreSignupService);

  protected readonly mode = this.route.snapshot.data['subscriptionAction'] as ActionMode;
  // The page is prerendered without the #token fragment. Render the state a real link lands on,
  // so the static HTML and the hydrated page match and nothing flashes; ngOnInit falls back to the
  // error state only when the link really has no token.
  protected readonly status = signal<ActionStatus>('ready');
  protected readonly message = signal(
    this.mode === 'verify'
      ? 'Confirm that you want Rosemarry early-access updates.'
      : 'Confirm that this address should stop receiving Rosemarry updates.',
  );
  protected readonly receiptSent = signal(false);
  protected readonly eyebrow = computed(() => {
    if (this.status() === 'success') {
      return this.mode === 'verify' ? 'Confirmed' : 'Preferences updated';
    }
    return this.mode === 'verify' ? 'Early access' : 'Email preferences';
  });
  protected readonly heading = computed(() => {
    if (this.status() === 'success') {
      return this.mode === 'verify' ? 'Email confirmed!' : "You're unsubscribed";
    }
    return this.mode === 'verify' ? 'Confirm your email' : 'Unsubscribe';
  });
  protected readonly resendStatus = signal<'idle' | 'working' | 'sent' | 'error'>('idle');
  protected readonly turnstileToken = signal<string | null>(null);
  protected readonly turnstileResetVersion = signal(0);
  protected readonly resendForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(EMAIL_PATTERN),
        Validators.maxLength(254),
      ],
    }),
  });

  private token: string | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const fragment = window.location.hash;
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

    if (fragment.startsWith('#token=')) {
      try {
        const token = decodeURIComponent(fragment.slice('#token='.length));
        this.token = token.length >= 32 && token.length <= 256 ? token : null;
      } catch {
        this.token = null;
      }
    }

    if (!this.token) {
      this.status.set('error');
      this.message.set('This link is incomplete or invalid.');
    }
  }

  protected runAction(): void {
    if (!this.token || this.status() === 'working') return;

    this.status.set('working');
    const request =
      this.mode === 'verify'
        ? this.service.confirmVerification(this.token)
        : this.service.unsubscribe(this.token);

    request.subscribe({
      next: (response) => {
        this.status.set('success');
        this.receiptSent.set(this.mode === 'verify' && response.receiptSent === true);
        this.message.set(
          this.mode === 'verify'
            ? "You're confirmed and on the early-access list."
            : 'This address has been unsubscribed.',
        );
        this.token = null;
      },
      error: (error: HttpErrorResponse) => {
        this.status.set('error');
        this.message.set(
          error.status >= 500
            ? 'We could not complete this request right now. Please try again.'
            : this.mode === 'verify'
              ? 'This confirmation link is invalid, expired, or already used.'
              : 'This unsubscribe link is invalid.',
        );
      },
    });
  }

  protected setTurnstileToken(token: string | null): void {
    this.turnstileToken.set(token);
  }

  protected resend(): void {
    this.resendForm.markAllAsTouched();
    const turnstileToken = this.turnstileToken();

    if (this.resendForm.invalid || !turnstileToken || this.resendStatus() === 'working') {
      return;
    }

    this.resendStatus.set('working');
    this.service
      .resendVerification({
        email: this.resendForm.controls.email.value.trim(),
        turnstileToken,
      })
      .pipe(
        finalize(() => {
          this.turnstileToken.set(null);
          this.turnstileResetVersion.update((version) => version + 1);
        }),
      )
      .subscribe({
        next: () => this.resendStatus.set('sent'),
        error: () => this.resendStatus.set('error'),
      });
  }
}
