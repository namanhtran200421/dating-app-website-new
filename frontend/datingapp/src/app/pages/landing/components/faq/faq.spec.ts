import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HomeFaq } from './faq';

describe('HomeFaq', () => {
  let fixture: ComponentFixture<HomeFaq>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeFaq],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeFaq);
    await fixture.whenStable();
  });

  it('shows the first answer and moves the open state between questions', () => {
    const element = fixture.nativeElement as HTMLElement;
    const questions = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.faq-card__trigger'),
    );

    expect(questions).toHaveLength(6);
    expect(questions[0].getAttribute('aria-expanded')).toBe('true');

    questions[1].click();
    fixture.detectChanges();

    expect(questions[0].getAttribute('aria-expanded')).toBe('false');
    expect(questions[1].getAttribute('aria-expanded')).toBe('true');
  });
});
