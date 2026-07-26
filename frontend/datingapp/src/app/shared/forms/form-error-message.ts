import { HttpErrorResponse } from '@angular/common/http';

export type FormContext = 'signup' | 'contact';

const CONTEXT_COPY: Record<
  FormContext,
  {
    invalid: string;
    missing: string;
    server: string;
    unknown: string;
  }
> = {
  signup: {
    invalid: 'That email did not pass the vibe check. Give it another look.',
    missing: 'The guest list is unavailable right now. Try again in a little bit.',
    server: 'Our guest list hit a tiny plot twist. Try again in a moment.',
    unknown: 'We could not save your spot this time. Please give it another go.',
  },
  contact: {
    invalid: 'A few details need another look before this note can fly.',
    missing: 'The Rosemarry inbox is unavailable right now. Try again in a little bit.',
    server: 'Our inbox hit a tiny plot twist. Your message is safe here—try sending again.',
    unknown: 'Your note stayed in drafts. Please try sending it one more time.',
  },
};

export function getFormErrorMessage(error: HttpErrorResponse, context: FormContext): string {
  const copy = CONTEXT_COPY[context];

  switch (error.status) {
    case 0:
      return 'We could not reach Rosemarry. Check your connection and try again.';
    case 400:
    case 422:
      return copy.invalid;
    case 401:
      return 'Your session is no longer valid. Refresh the page and try again.';
    case 403:
      return 'The security check did not go through. Refresh it and try again.';
    case 404:
    case 405:
      return copy.missing;
    case 408:
    case 504:
      return 'That took longer than expected. Nothing was sent—please try again.';
    case 409:
      return context === 'signup'
        ? 'That email already made the guest list. You’re already in ♡'
        : 'That message was already received. No need to send it twice.';
    case 413:
      return 'That message is a little too big to send. Shorten it and try again.';
    case 429:
      return 'You have sent a few requests too quickly. Take a short breather and try again.';
    case 502:
    case 503:
      return 'The security service is taking a quick breather. Please try again shortly.';
    default:
      return error.status >= 500 ? copy.server : copy.unknown;
  }
}
