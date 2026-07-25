import { ComponentFixture, TestBed } from '@angular/core/testing';

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

  it('dismisses the notice when the close button is clicked', () => {
    const closeButton = fixture.nativeElement.querySelector(
      '[aria-label="Dismiss early-stage notice"]',
    ) as HTMLButtonElement;

    closeButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.early-stage-banner')).toBeNull();
  });
});
