import { TestBed } from '@angular/core/testing';
import { EarlyStageBanner } from './early-stage-banner';

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

describe('EarlyStageBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.style.overflow = '';
  });

  it('opens as a modal dialog and remembers dismissal for the session', async () => {
    await TestBed.configureTestingModule({ imports: [EarlyStageBanner] }).compileComponents();
    const fixture = TestBed.createComponent(EarlyStageBanner);
    fixture.detectChanges();
    await fixture.whenStable();
    await waitForNextFrame();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(fixture.nativeElement.textContent).toContain('in development');
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe('early-stage-title');
    expect(document.body.style.overflow).toBe('hidden');

    fixture.nativeElement.querySelector('.early-stage-card__action').click();
    fixture.detectChanges();

    expect(dialog.open).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(sessionStorage.getItem('rosemarry-early-stage-dismissed')).toBe('true');
  });

  it('stays closed after it has been dismissed in the current session', async () => {
    sessionStorage.setItem('rosemarry-early-stage-dismissed', 'true');
    await TestBed.configureTestingModule({ imports: [EarlyStageBanner] }).compileComponents();
    const fixture = TestBed.createComponent(EarlyStageBanner);
    fixture.detectChanges();
    await fixture.whenStable();
    await waitForNextFrame();

    expect((fixture.nativeElement.querySelector('dialog') as HTMLDialogElement).open).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('shows a fixed fallback before locking scroll when the native dialog API fails', async () => {
    await TestBed.configureTestingModule({ imports: [EarlyStageBanner] }).compileComponents();
    const fixture = TestBed.createComponent(EarlyStageBanner);
    fixture.detectChanges();
    await fixture.whenStable();
    await waitForNextFrame();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.classList).toContain('early-stage-dialog--fallback');
    expect(document.body.style.overflow).toBe('hidden');

    fixture.nativeElement.querySelector('.early-stage-card__action').click();
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });
});
