import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SignupState } from '../landing/signup-state';

@Component({
  selector: 'app-about-us-page',
  imports: [RouterLink],
  templateUrl: './about-us-page.html',
  styleUrl: './about-us-page.css',
})
export class AboutUsPage {
  protected readonly signup = inject(SignupState);
}
