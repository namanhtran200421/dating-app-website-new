import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Nav } from './core/layout/nav/nav';
import { Footer } from './core/layout/footer/footer';
import { EarlyStageBanner } from './core/layout/early-stage-banner/early-stage-banner';
import { ScrollReveal } from './shared/scroll-reveal/scroll-reveal';
import { SeoService } from './core/seo/seo.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Nav, Footer, EarlyStageBanner, ScrollReveal],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected isHomePage = true;

  constructor() {
    this.seo.connect();
  }

  protected onRouteActivate(): void {
    const [path] = this.router.url.split(/[?#]/);
    this.isHomePage = path === '/';
  }
}
