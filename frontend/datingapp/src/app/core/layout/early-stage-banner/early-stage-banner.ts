import { Component, afterNextRender, signal } from '@angular/core';

const DISMISSED_KEY = 'rosemarry-early-stage-dismissed';

@Component({
  selector: 'app-early-stage-banner',
  standalone: true,
  templateUrl: './early-stage-banner.html',
  styleUrl: './early-stage-banner.css',
})
export class EarlyStageBanner {
  protected readonly visible = signal(true);

  constructor() {
    afterNextRender(() => {
      try { this.visible.set(sessionStorage.getItem(DISMISSED_KEY) !== 'true'); }
      catch { /* Keep the notice readable when storage is unavailable. */ }
    });
  }

  protected dismiss(): void {
    this.visible.set(false);
    try { sessionStorage.setItem(DISMISSED_KEY, 'true'); }
    catch { /* Dismissal also works without storage. */ }
  }
}
