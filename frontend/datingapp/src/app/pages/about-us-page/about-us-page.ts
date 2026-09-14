import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-about-us-page',
  imports: [],
  templateUrl: './about-us-page.html',
  styleUrl: './about-us-page.css',
})
export class AboutUsPage {
  protected readonly showNextTeam = signal(false);

  protected toggleFounderGroup(): void {
    this.showNextTeam.update((showingNext) => !showingNext);
  }
}
