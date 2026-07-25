import { Component } from '@angular/core';
import { SignupState } from './signup-state';
import { Hero } from './components/hero/hero';
import { Problem } from './components/problem/problem';
import { Solution } from './components/solution/solution';
import { Pricing } from './components/pricing/pricing';

@Component({
  selector: 'app-landing',
  imports: [Hero, Problem, Solution, Pricing],
  templateUrl: './landing.html',
})
export class Landing {}
