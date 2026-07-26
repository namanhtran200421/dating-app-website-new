const LOCAL_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

const PRODUCTION_TURNSTILE_SITE_KEY = '0x4AAAAAAD-RPeWupuinKkcl';

export function getTurnstileSiteKey(): string {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return LOCAL_TURNSTILE_SITE_KEY;
  }

  return PRODUCTION_TURNSTILE_SITE_KEY;
}
