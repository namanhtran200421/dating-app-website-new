import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SignupState } from '../../../pages/landing/signup-state';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class Nav {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly signup = inject(SignupState);
  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 24);
  }

  @HostListener('document:keydown.escape')
  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen() && !this.element.nativeElement.contains(event.target as Node)) {
      this.closeMenu();
    }
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }
}
