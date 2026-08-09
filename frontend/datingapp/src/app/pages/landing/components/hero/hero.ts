import { Component, inject } from '@angular/core';
import { SignupState } from '../../signup-state';

@Component({
  selector: 'app-landing-hero',
  templateUrl: './hero.html',
  styleUrl: './hero-circle.css',
})
export class Hero {
  protected readonly signup = inject(SignupState);
}
