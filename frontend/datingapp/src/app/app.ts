import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Nav } from './core/layout/nav/nav';
import { Footer } from './core/layout/footer/footer';
import { EarlyStageBanner } from './core/layout/early-stage-banner/early-stage-banner';
import { ScrollReveal } from './shared/scroll-reveal/scroll-reveal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Nav, Footer, EarlyStageBanner, ScrollReveal],
  templateUrl: './app.html',
})
export class App {}
