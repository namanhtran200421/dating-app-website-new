import { Injectable, computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PreSignupService } from '../../services/pre-signup.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable({
  providedIn: 'root',
})
export class SignupState {
  constructor(private readonly preSignupService: PreSignupService) {}

  public readonly preSignForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(EMAIL_PATTERN),
        Validators.maxLength(100),
      ],
    }),
  });

  public readonly submitted = signal(false);
  readonly signupOpen = signal(false);
  public readonly emailError = signal(false);
  public readonly duplicateEmailError = signal(false);
  public readonly securityError = signal(false);
  public readonly isSubmitting = signal(false);
  public readonly turnstileToken = signal<string | null>(null);
  public readonly turnstileResetVersion = signal(0);
  public readonly submittedEmail = signal('');

  readonly showSignupButton = computed(() => !this.signupOpen() && !this.submitted());
  readonly showSignupForm = computed(() => this.signupOpen() && !this.submitted());

  open(): void {
    this.signupOpen.set(true);
    queueMicrotask(() => document.getElementById('rm-email-input')?.focus());
  }

  goToSignup(): void {
    const target = document.getElementById('join');
    target?.scrollIntoView({ behavior: 'smooth' });
    this.signupOpen.set(true);
    setTimeout(() => document.getElementById('rm-email-input')?.focus(), 650);
  }

  public setTurnstileToken(token: string | null): void {
    this.turnstileToken.set(token);

    if (token) {
      this.securityError.set(false);
    }
  }

  public markTurnstileError(): void {
    this.turnstileToken.set(null);
    this.securityError.set(true);
  }

  public submit(): void {
    this.emailError.set(false);
    this.duplicateEmailError.set(false);
    this.securityError.set(false);
    this.preSignForm.markAllAsTouched();

    if (this.preSignForm.invalid) {
      this.emailError.set(true);
      return;
    }

    const turnstileToken = this.turnstileToken();

    if (!turnstileToken) {
      this.securityError.set(true);
      return;
    }

    const email = this.preSignForm.controls.email.value.trim();
    this.isSubmitting.set(true);

    this.preSignupService
      .preSignup({ email, turnstileToken })
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
          this.turnstileToken.set(null);
          this.turnstileResetVersion.update((version) => version + 1);
        }),
      )
      .subscribe({
        next: () => {
          this.submittedEmail.set(email);
          this.preSignForm.reset();
          this.emailError.set(false);
          this.duplicateEmailError.set(false);
          this.submitted.set(true);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Pre-signup failed:', error);

          if (error.error?.message === 'This email has already been registered') {
            this.duplicateEmailError.set(true);
            return;
          }

          if (error.status === 403 || error.status === 503) {
            this.securityError.set(true);
            return;
          }

          this.emailError.set(true);
        },
      });
  }
}
