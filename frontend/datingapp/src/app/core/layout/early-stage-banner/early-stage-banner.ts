import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-early-stage-banner',
  standalone: true,
  imports: [],
  templateUrl: './early-stage-banner.html',
  styleUrl: './early-stage-banner.css',
})
export class EarlyStageBanner {
  protected readonly visible = signal(true);

  protected dismiss(): void {
    this.visible.set(false);
  }
}
