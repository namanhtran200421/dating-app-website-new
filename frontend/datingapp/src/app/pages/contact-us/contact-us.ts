import { PreSignupService } from './../../services/pre-signup.service';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-contact-us',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-us.html',
})
export class ContactUs {
  constructor(private preSignupService: PreSignupService) {}

  protected readonly submitted = signal(false);

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

  protected addContact(): void {
    this.submitted.set(false);
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.preSignupService.addContact(this.contactForm.getRawValue()).subscribe({
      next: () => {
        this.contactForm.reset();
        this.submitted.set(true);
      },
      error: (error) => console.error('Unable to send contact message', error),
    });
      alert("sending works");
  }
}
