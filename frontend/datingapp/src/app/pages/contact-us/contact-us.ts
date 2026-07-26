import { PreSignupService } from './../../services/pre-signup.service';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2/dist/sweetalert2.esm.js';
import { TurnstileWidget } from '../../shared/turnstile/turnstile-widget';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-contact-us',
  imports: [ReactiveFormsModule, TurnstileWidget],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.css',
})
export class ContactUs {
  constructor(private preSignupService: PreSignupService) {}

  protected readonly turnstileToken = signal<string | null>(null);
  protected readonly turnstileResetVersion = signal(0);
  protected readonly securityError = signal(false);
  protected readonly isSubmitting = signal(false);

  protected readonly contactForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(EMAIL_PATTERN)],
    }),
    subject: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(5000)],
    }),
  });

  protected setTurnstileToken(token: string | null): void {
    this.turnstileToken.set(token);

    if (token) {
      this.securityError.set(false);
    }
  }

  protected markTurnstileError(): void {
    this.turnstileToken.set(null);
    this.securityError.set(true);
  }

  protected addContact(): void {
    this.securityError.set(false);

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const turnstileToken = this.turnstileToken();

    if (!turnstileToken) {
      this.securityError.set(true);
      return;
    }

    this.isSubmitting.set(true);
    this.preSignupService
      .addContact({
        ...this.contactForm.getRawValue(),
        turnstileToken,
      })
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
          this.turnstileToken.set(null);
          this.turnstileResetVersion.update((version) => version + 1);
        }),
      )
      .subscribe({
        next: () => {
          this.contactForm.reset();
          Swal.fire({
            title: 'Message delivered. You ate.',
            text: 'We got the lore. Keep an eye on your inbox for the reply arc.',
            icon: 'success',
            iconColor: '#d81e4a',

            position: 'center',
            target: document.body,
            width: 'min(92vw, 440px)',

            timer: 2400,
            showConfirmButton: false,

            heightAuto: false,
            backdrop: 'rgba(28, 20, 24, 0.48)',

            showClass: {
              popup: 'rosemarry-swal-enter',
              backdrop: 'rosemarry-backdrop-enter',
            },

            hideClass: {
              popup: 'rosemarry-swal-exit',
              backdrop: 'rosemarry-backdrop-exit',
            },

            customClass: {
              container: 'rosemarry-swal-container',
              popup: 'rosemarry-swal-popup',
              icon: 'rosemarry-swal-icon',
              title: 'rosemarry-swal-title',
              htmlContainer: 'rosemarry-swal-text',
            },

            didOpen: (popup) => {
              const icon = popup.querySelector('.swal2-icon');

              icon?.classList.add('rosemarry-icon-bounce');
            },
          });
        },
        error: (error: HttpErrorResponse) => {
          console.error('Unable to send contact message', error);

          if (error.status === 403 || error.status === 503) {
            this.securityError.set(true);
          }
        },
      });
  }
}
