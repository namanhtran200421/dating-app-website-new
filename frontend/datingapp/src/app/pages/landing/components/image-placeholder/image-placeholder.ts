import { Component, input } from '@angular/core';

@Component({
  selector: 'app-image-placeholder',
  templateUrl: './image-placeholder.html',
})
export class ImagePlaceholder {
  readonly label = input.required<string>();
  readonly ratio = input('4/3');
}
