import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SignupState } from '../../../pages/landing/signup-state';
import { ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-footer',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './footer.html',
})
export class Footer {
  protected readonly signup = inject(SignupState);
}
