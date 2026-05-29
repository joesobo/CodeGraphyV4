import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readCssTokenValue, resolveCssToken } from '../../../../src/webview/components/graph/appearance/cssToken';

let cssTokens: Record<string, string>;
let computedColors: Record<string, string>;

describe('graph/appearance/cssToken', () => {
  beforeEach(() => {
    cssTokens = {};
    computedColors = {};
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => ({
      color: computedColors[readStyleToken(element)] ?? '',
      getPropertyValue: (tokenName: string) => cssTokens[tokenName] ?? '',
    } as CSSStyleDeclaration));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the fallback when no document is available', () => {
    expect(resolveCssToken('--cg-missing', 'Fallback', null, window)).toBe('Fallback');
  });

  it('returns the fallback when no window is available', () => {
    expect(resolveCssToken('--cg-missing', 'Fallback', document, null)).toBe('Fallback');
  });

  it('trims raw CSS token values before resolving computed colors', () => {
    cssTokens['--cg-raw'] = '  rgb(1, 2, 3)  ';

    expect(resolveCssToken('--cg-raw', 'Fallback')).toBe('rgb(1, 2, 3)');
  });

  it('trims computed CSS colors before returning them', () => {
    cssTokens['--cg-var'] = 'var(--vscode-editor-background)';
    computedColors['--cg-var'] = '  rgb(4, 5, 6)  ';

    expect(resolveCssToken('--cg-var', 'Fallback')).toBe('rgb(4, 5, 6)');
  });

  it('returns the raw token value when the document cannot host a computed-color probe', () => {
    const documentWithoutBody = {
      body: null,
      createElement: document.createElement.bind(document),
      documentElement: document.documentElement,
    };
    cssTokens['--cg-var'] = 'var(--vscode-editor-background)';

    expect(resolveCssToken('--cg-var', 'Fallback', documentWithoutBody, window)).toBe('var(--vscode-editor-background)');
  });

  it('reads stage token values without resolving var references', () => {
    cssTokens['--cg-stage'] = '  var(--cg-popover-translucent)  ';

    expect(readCssTokenValue('--cg-stage', 'Fallback')).toBe('var(--cg-popover-translucent)');
  });
});

function readStyleToken(element: Element): string {
  const styleColor = (element as HTMLElement).style?.color ?? '';
  const match = styleColor.match(/^var\((--[^)]+)\)$/);
  return match?.[1] ?? '';
}
