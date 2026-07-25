import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Nav } from './core/layout/nav/nav';
import { Footer } from './core/layout/footer/footer';
import { EarlyStageBanner } from './core/layout/early-stage-banner/early-stage-banner';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Nav, Footer, EarlyStageBanner],
  templateUrl: './app.html',
})
export class App {}
