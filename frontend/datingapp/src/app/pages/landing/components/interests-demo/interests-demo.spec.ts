import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterestsDemo } from './interests-demo';

describe('InterestsDemo', () => {
  let fixture: ComponentFixture<InterestsDemo>;
  let element: HTMLElement;

  const chips = () => Array.from(element.querySelectorAll<HTMLButtonElement>('.interest-chip'));
  const action = () => element.querySelector<HTMLButtonElement>('.demo-action')!;
  const click = async (button: HTMLElement) => {
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InterestsDemo] }).compileComponents();
    fixture = TestBed.createComponent(InterestsDemo);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('caps interests at five and only continues once one is picked', async () => {
    expect(action().disabled).toBe(true);

    for (const chip of chips().slice(0, 5)) await click(chip);

    expect(element.querySelector('.demo-count')?.textContent).toContain('5/5');
    expect(chips()[0].getAttribute('aria-pressed')).toBe('true');
    expect(chips()[5].disabled).toBe(true);
    expect(action().disabled).toBe(false);

    await click(chips()[0]);
    expect(chips()[5].disabled).toBe(false);
  });

  it('walks through choosing a goal and can start over', async () => {
    await click(chips()[1]);
    await click(action());

    expect(element.querySelector('.demo-title')?.textContent).toContain(
      'What are you looking for?',
    );
    expect(action().disabled).toBe(true);

    const casual = Array.from(element.querySelectorAll<HTMLInputElement>('input[type="radio"]'))[2];
    await click(casual);
    await click(action());

    const tags = Array.from(element.querySelectorAll('.done-tag')).map((tag) =>
      tag.textContent?.trim(),
    );
    expect(tags).toEqual(['Casual dating', 'Shopping']);

    await click(action());
    expect(chips().some((chip) => chip.classList.contains('is-picked'))).toBe(false);
  });
});
