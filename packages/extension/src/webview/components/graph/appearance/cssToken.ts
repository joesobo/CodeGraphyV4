type TokenDocument = Pick<Document, 'createElement' | 'documentElement'> & {
  body: HTMLElement | null;
};
type TokenWindow = Pick<Window, 'getComputedStyle'>;

function getDefaultDocument(): Document | undefined {
  return globalThis.document;
}

function getDefaultWindow(): Window | undefined {
  return globalThis.window;
}

function getThemeRoot(ownerDocument: TokenDocument | null | undefined): Element | null {
  return ownerDocument?.documentElement ?? null;
}

function readRawCssTokenValue(
  tokenName: string,
  ownerDocument: TokenDocument | null | undefined,
  ownerWindow: TokenWindow | null | undefined,
): string {
  const themeRoot = getThemeRoot(ownerDocument);
  if (!themeRoot || !ownerWindow) return '';

  return ownerWindow.getComputedStyle(themeRoot).getPropertyValue(tokenName).trim();
}

function resolveComputedColor(
  tokenName: string,
  ownerDocument: TokenDocument,
  ownerWindow: TokenWindow,
): string {
  if (!ownerDocument.body) return '';

  const probe = ownerDocument.createElement('span');
  probe.style.color = `var(${tokenName})`;

  ownerDocument.body.appendChild(probe);
  const color = ownerWindow.getComputedStyle(probe).color.trim();
  probe.remove();
  return color;
}

export function resolveCssToken(
  tokenName: string,
  fallback: string,
  ownerDocument: TokenDocument | null | undefined = getDefaultDocument(),
  ownerWindow: TokenWindow | null | undefined = getDefaultWindow(),
): string {
  const value = readRawCssTokenValue(tokenName, ownerDocument, ownerWindow);
  if (value === '') return fallback;

  return resolveComputedColor(tokenName, ownerDocument!, ownerWindow!) || value;
}

export function readCssTokenValue(
  tokenName: string,
  fallback: string,
  ownerDocument: TokenDocument | null | undefined = getDefaultDocument(),
  ownerWindow: TokenWindow | null | undefined = getDefaultWindow(),
): string {
  return readRawCssTokenValue(tokenName, ownerDocument, ownerWindow) || fallback;
}
