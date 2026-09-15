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

  it('presents the Circle journey in four ordered steps', () => {
    const heading = fixture.nativeElement.querySelector('h1');
    const steps = fixture.nativeElement.querySelectorAll('.journey-card');

    expect(heading.textContent).toContain('One week.');
    expect(steps).toHaveLength(4);
  });

  it('provides working page landmarks and jump links', () => {
    const jumpLinks = fixture.nativeElement.querySelectorAll('.how-jump a');

    expect(jumpLinks).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('#before')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#the-week')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#your-choice')).toBeTruthy();
  });
});
