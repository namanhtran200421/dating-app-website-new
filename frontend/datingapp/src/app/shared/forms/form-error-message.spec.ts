import { HttpErrorResponse } from '@angular/common/http';

import { getFormErrorMessage } from './form-error-message';

describe('getFormErrorMessage', () => {
  it('explains network failures', () => {
    const error = new HttpErrorResponse({ status: 0 });

    expect(getFormErrorMessage(error, 'contact')).toContain('connection');
  });

  it('explains rate limits', () => {
    const error = new HttpErrorResponse({ status: 429 });

    expect(getFormErrorMessage(error, 'signup')).toContain('too quickly');
  });

  it('uses context-specific server copy', () => {
    const error = new HttpErrorResponse({ status: 500 });

    expect(getFormErrorMessage(error, 'signup')).toContain('guest list');
    expect(getFormErrorMessage(error, 'contact')).toContain('inbox');
  });

  it('does not expose an arbitrary backend error message', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: { message: 'Database password: do-not-display' },
    });

    expect(getFormErrorMessage(error, 'contact')).not.toContain('Database password');
  });
});
