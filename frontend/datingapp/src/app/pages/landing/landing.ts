import { Component, inject } from '@angular/core';
import { SignupState } from './signup-state';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.html',
  styleUrls: ['./landing.css', '../../../landing-steps.css'],
})
export class Landing {
  protected readonly signup = inject(SignupState);
}
