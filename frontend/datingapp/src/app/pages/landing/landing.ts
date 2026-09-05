import { Component } from '@angular/core';
import { SignupState } from './signup-state';
import { Hero } from './components/hero/hero';
import { Problem } from './components/problem/problem';
import { Solution } from './components/solution/solution';
import { Pricing } from './components/pricing/pricing';
import { Facts } from './components/facts/facts';

@Component({
  selector: 'app-landing',
  imports: [Hero, Problem, Solution, Pricing, Facts],
  templateUrl: './landing.html',
})
export class Landing {}
