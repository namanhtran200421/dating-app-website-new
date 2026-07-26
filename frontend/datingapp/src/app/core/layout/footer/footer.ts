import { Component, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SignupState } from '../../../pages/landing/signup-state';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  readonly showScallop = input(true);
  protected readonly signup = inject(SignupState);
}
