import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembersDemo } from './members-demo';

describe('MembersDemo', () => {
  let fixture: ComponentFixture<MembersDemo>;
  let element: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [MembersDemo] }).compileComponents();
    fixture = TestBed.createComponent(MembersDemo);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('slides to a new Circle with three returning members highlighted', async () => {
    expect(element.querySelector('.demo-title')?.textContent).toContain('Circle 1');
    expect(element.querySelectorAll('.member__avatar')).toHaveLength(10);
    expect(element.querySelectorAll('.member--returning')).toHaveLength(0);

    fixture.componentInstance.showNextCircle();
    fixture.detectChanges();
    expect(element.querySelector('.member-grid--leaving')).not.toBeNull();

    await vi.advanceTimersByTimeAsync(240);
    fixture.detectChanges();
    expect(element.querySelector('.demo-title')?.textContent).toContain('Circle 2');
    expect(element.querySelector('.member-grid--entering')).not.toBeNull();
    expect(element.querySelectorAll('.member--returning')).toHaveLength(3);
    expect(element.textContent).toContain('Familiar faces');
  });
});
