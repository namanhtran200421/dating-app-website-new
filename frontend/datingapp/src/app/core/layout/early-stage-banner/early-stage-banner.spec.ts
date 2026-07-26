import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { EarlyStageBanner } from './early-stage-banner';

describe('EarlyStageBanner', () => {
  let fixture: ComponentFixture<EarlyStageBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EarlyStageBanner],
    }).compileComponents();

    fixture = TestBed.createComponent(EarlyStageBanner);
    fixture.detectChanges();
  });

  it('dismisses the notice after its close animation', () => {
    vi.useFakeTimers();

    try {
      const closeButton = fixture.nativeElement.querySelector(
        '[aria-label="Dismiss early-stage notice"]',
      ) as HTMLButtonElement;

      closeButton.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.early-stage-modal--closing')).not.toBeNull();

      vi.advanceTimersByTime(540);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.early-stage-banner')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
