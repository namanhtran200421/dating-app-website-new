import { PreSignupService } from './../../services/pre-signup.service';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2/dist/sweetalert2.esm.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-contact-us',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.css',
})
export class ContactUs {
  constructor(private preSignupService: PreSignupService) {}

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
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.preSignupService.addContact(this.contactForm.getRawValue()).subscribe({
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
          timerProgressBar: true,
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
            timerProgressBar: 'rosemarry-swal-progress',
          },

          didOpen: (popup) => {
            const icon = popup.querySelector('.swal2-icon');

            icon?.classList.add('rosemarry-icon-bounce');
          },
        });
      },
      error: (error) => console.error('Unable to send contact message', error),
    });
  }
}
