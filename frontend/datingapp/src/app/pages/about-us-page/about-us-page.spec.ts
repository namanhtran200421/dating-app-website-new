import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AboutUsPage } from './about-us-page';

describe('AboutUsPage', () => {
  let component: AboutUsPage;
  let fixture: ComponentFixture<AboutUsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutUsPage],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutUsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders six team members across two groups', () => {
    const cards = fixture.nativeElement.querySelectorAll('.founder-card');
    const numbers = Array.from(
      fixture.nativeElement.querySelectorAll('.founder-card__number'),
      (number: Element) => number.textContent?.trim(),
    );

    expect(cards).toHaveLength(6);
    expect(numbers).toEqual(['01', '02', '03', '04', '05', '06']);
  });

  it('lists the second group directly below the founding team', () => {
    const rosters = fixture.nativeElement.querySelectorAll('.founder-roster');

    expect(rosters).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.founders-switch')).toBeNull();
    expect(rosters[0].nextElementSibling).toBe(rosters[1]);
  });
});
