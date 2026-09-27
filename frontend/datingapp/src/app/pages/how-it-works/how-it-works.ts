import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SignupState } from '../landing/signup-state';

@Component({
  selector: 'app-how-it-works',
  imports: [RouterLink],
  templateUrl: './how-it-works.html',
  styleUrls: [
    '../../../generated/icons/pages-blog.css',
    '../story-pages.css',
    './how-it-works.css',
  ],
})
export class HowItWorksPage {
  protected readonly signup = inject(SignupState);
}
