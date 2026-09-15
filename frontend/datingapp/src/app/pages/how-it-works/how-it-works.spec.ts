import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HowItWorksPage } from './how-it-works';

describe('HowItWorksPage', () => {
  let fixture: ComponentFixture<HowItWorksPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HowItWorksPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HowItWorksPage);
    fixture.detectChanges();
  });

  it('explains the weekly Circle in three ordered steps', () => {
    const heading = fixture.nativeElement.querySelector('h1');
    const steps = fixture.nativeElement.querySelectorAll('.journey-card h3');

    expect(heading.textContent).toContain('How Circles work.');
    expect([...steps].map((step: Element) => step.textContent)).toEqual([
      'Join a Circle.',
      'Chat and do activities.',
      'The Circle refreshes.',
    ]);
  });

  it('explains mutual matching', () => {
    const matching = fixture.nativeElement.querySelector('#matching');

    expect(matching.textContent).toContain('If it’s mutual, it’s a match.');
  });
});
