import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { getTurnstileSiteKey } from './turnstile.config';

type TurnstileStatus = 'loading' | 'ready' | 'expired' | 'error';

interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  appearance: 'interaction-only';
  size: 'flexible';
  theme: 'light';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
  'timeout-callback': () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

@Component({
  selector: 'app-turnstile-widget',
  template: `
    <div class="turnstile-widget">
      <div #widgetContainer class="turnstile-widget__container"></div>

      @if (status() === 'expired') {
        <p class="turnstile-widget__status turnstile-widget__status--error" role="alert">
          The security check expired. We&rsquo;re refreshing it now.
        </p>
      }

      @if (status() === 'error') {
        <p class="turnstile-widget__status turnstile-widget__status--error" role="alert">
          The security check could not load. Refresh the page and try again.
        </p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .turnstile-widget {
      display: grid;
      gap: 0.35rem;
      min-width: 0;
    }

    .turnstile-widget__container {
      width: 100%;
      min-height: 1px;
    }

    .turnstile-widget__status {
      margin: 0;
      color: rgb(28 20 24 / 58%);
      font:
        650 0.68rem/1.45 'Playpen Sans',
        system-ui,
        sans-serif;
    }

    .turnstile-widget__status--error {
      color: #d81e4a;
    }
  `,
})
export class TurnstileWidget implements AfterViewInit, OnDestroy {
  private static scriptPromise: Promise<TurnstileApi> | null = null;

  private readonly zone = inject(NgZone);
  private destroyed = false;
  private widgetId: string | null = null;

  readonly action = input.required<string>();
  readonly resetVersion = input(0);
  readonly tokenChange = output<string | null>();
  readonly verificationError = output<void>();
  protected readonly status = signal<TurnstileStatus>('loading');

  @ViewChild('widgetContainer', { static: true })
  private readonly widgetContainer!: ElementRef<HTMLDivElement>;

  constructor() {
    effect(() => {
      this.resetVersion();

      if (this.widgetId && window.turnstile) {
        this.status.set('loading');
        this.tokenChange.emit(null);
        window.turnstile.reset(this.widgetId);
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      const turnstile = await TurnstileWidget.loadScript();

      if (this.destroyed) {
        return;
      }

      const sitekey = getTurnstileSiteKey();

      if (sitekey === 'PASTE_YOUR_TURNSTILE_SITE_KEY_HERE') {
        throw new Error('The production Turnstile Site key has not been configured.');
      }

      this.widgetId = turnstile.render(this.widgetContainer.nativeElement, {
        sitekey,
        action: this.action(),
        appearance: 'interaction-only',
        size: 'flexible',
        theme: 'light',
        callback: (token) => {
          this.zone.run(() => {
            this.status.set('ready');
            this.tokenChange.emit(token);
          });
        },
        'expired-callback': () => {
          this.zone.run(() => {
            this.status.set('expired');
            this.tokenChange.emit(null);
            this.reset();
          });
        },
        'error-callback': () => {
          this.zone.run(() => {
            this.status.set('error');
            this.tokenChange.emit(null);
            this.verificationError.emit();
          });
        },
        'timeout-callback': () => {
          this.zone.run(() => {
            this.status.set('expired');
            this.tokenChange.emit(null);
            this.reset();
          });
        },
      });
    } catch (error) {
      console.error('Unable to initialise Turnstile:', error);
      this.status.set('error');
      this.tokenChange.emit(null);
      this.verificationError.emit();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;

    if (this.widgetId && window.turnstile) {
      window.turnstile.remove(this.widgetId);
    }
  }

  private reset(): void {
    if (!this.widgetId || !window.turnstile) {
      return;
    }

    this.status.set('loading');
    window.turnstile.reset(this.widgetId);
  }

  private static loadScript(): Promise<TurnstileApi> {
    if (window.turnstile) {
      return Promise.resolve(window.turnstile);
    }

    if (TurnstileWidget.scriptPromise) {
      return TurnstileWidget.scriptPromise;
    }

    TurnstileWidget.scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${TURNSTILE_SCRIPT_URL}"]`,
      );
      const script = existingScript ?? document.createElement('script');

      const handleLoad = (): void => {
        if (window.turnstile) {
          resolve(window.turnstile);
          return;
        }

        reject(new Error('Turnstile loaded without exposing its browser API.'));
      };

      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener(
        'error',
        () => reject(new Error('Turnstile script failed to load.')),
        {
          once: true,
        },
      );

      if (!existingScript) {
        script.src = TURNSTILE_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    });

    return TurnstileWidget.scriptPromise;
  }
}
