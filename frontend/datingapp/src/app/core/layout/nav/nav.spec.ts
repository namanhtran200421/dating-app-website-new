import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Nav } from './nav';

/** The nav coalesces scroll work into one animation frame, so tests wait for that frame. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

describe('Nav', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });

    await TestBed.configureTestingModule({
      imports: [Nav],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('keeps the primary desktop navigation concise', () => {
    const fixture = TestBed.createComponent(Nav);
    fixture.detectChanges();

    const primary = fixture.nativeElement.querySelector('.nav-desktop__primary');
    const actions = fixture.nativeElement.querySelector('.nav-desktop__actions');

    expect(primary.textContent).toContain('How it works');
    expect(primary.textContent).toContain('Journal');
    expect(primary.textContent).toContain('About');
    expect(actions.textContent).toContain('Join early access');
  });

  it('uses the same Journal label in desktop and mobile navigation', () => {
    const fixture = TestBed.createComponent(Nav);
    fixture.detectChanges();

    const desktopNavigation = fixture.nativeElement.querySelector('.nav-desktop__primary');
    const mobileNavigation = fixture.nativeElement.querySelector('#mobile-navigation');

    expect(desktopNavigation.textContent).toContain('Journal');
    expect(mobileNavigation.textContent).toContain('Journal');
    expect(mobileNavigation.textContent).not.toContain('Blog');
  });

  it('opens the company navigation and returns focus to its trigger on Escape', () => {
    const fixture = TestBed.createComponent(Nav);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      '.nav-company__trigger',
    ) as HTMLButtonElement;
    const panel = fixture.nativeElement.querySelector('.nav-company__panel') as HTMLElement;

    trigger.click();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hasAttribute('inert')).toBe(false);
    expect(panel.textContent).toContain('Our story');
    expect(panel.textContent).toContain('Message us');
    expect(panel.textContent).not.toContain('Press kit');
    expect(panel.querySelectorAll('.fa-arrow-right')).toHaveLength(0);
    expect(
      fixture.nativeElement.querySelectorAll('#mobile-navigation .fa-arrow-right'),
    ).toHaveLength(0);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it('links How it works to its indexable route', () => {
    const fixture = TestBed.createComponent(Nav);
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('a[href="/how-it-works"]');
    expect(links).toHaveLength(2);
  });

  it('gets out of the way while scrolling down and returns while scrolling up', async () => {
    const fixture = TestBed.createComponent(Nav);
    fixture.detectChanges();
    const navigation = fixture.nativeElement.querySelector('.site-nav') as HTMLElement;

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 220 });
    window.dispatchEvent(new Event('scroll'));
    await nextFrame();
    fixture.detectChanges();
    expect(navigation.classList).toContain('site-nav--hidden');

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 190 });
    window.dispatchEvent(new Event('scroll'));
    await nextFrame();
    fixture.detectChanges();
    expect(navigation.classList).not.toContain('site-nav--hidden');
  });
});
