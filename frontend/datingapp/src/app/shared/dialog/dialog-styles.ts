import { DIALOG_STYLESHEET_URL } from '../../../generated/dialog-styles';

let pending: Promise<void> | null = null;

/**
 * Adds the dialog stylesheet to the document, once, and resolves when it has applied.
 *
 * Callers await this next to their dynamic `import()` of SweetAlert2 so the two land together and
 * the dialog never paints unstyled. A failed stylesheet resolves rather than rejects: an unstyled
 * confirmation is a much better outcome than swallowing the message entirely.
 */
export function loadDialogStyles(): Promise<void> {
  if (pending) {
    return pending;
  }

  pending = new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLLinkElement>(
      `link[href="${DIALOG_STYLESHEET_URL}"]`,
    );

    if (existing) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = DIALOG_STYLESHEET_URL;
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener(
      'error',
      () => {
        console.error('Unable to load the dialog stylesheet.');
        resolve();
      },
      { once: true },
    );
    document.head.appendChild(link);
  });

  return pending;
}
