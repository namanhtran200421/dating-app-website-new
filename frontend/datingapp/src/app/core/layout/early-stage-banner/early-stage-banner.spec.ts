import { TestBed } from '@angular/core/testing';
import { EarlyStageBanner } from './early-stage-banner';

describe('EarlyStageBanner', () => {
  beforeEach(() => sessionStorage.clear());

  it('is readable without locking scrolling or opening a dialog, and can be dismissed', async () => {
    await TestBed.configureTestingModule({ imports: [EarlyStageBanner] }).compileComponents();
    const fixture = TestBed.createComponent(EarlyStageBanner);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('in development');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.early-stage-banner')).toBeNull();
    expect(sessionStorage.getItem('rosemarry-early-stage-dismissed')).toBe('true');
  });
});
