import { Component, inject } from '@angular/core';
import { SignupState } from '../../signup-state';
import { ImagePlaceholder } from '../image-placeholder/image-placeholder';

@Component({
  selector: 'app-landing-hero',
  imports: [ImagePlaceholder],
  templateUrl: './hero.html',
})
export class Hero {
  protected readonly signup = inject(SignupState);
}
