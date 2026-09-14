import { Component, inject } from '@angular/core';
import { HomeFaq } from './components/faq/faq';
import { SignupState } from './signup-state';

@Component({
  selector: 'app-landing',
  imports: [HomeFaq],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css', '../../../landing-steps.css'],
})
export class Landing {
  protected readonly signup = inject(SignupState);
}
