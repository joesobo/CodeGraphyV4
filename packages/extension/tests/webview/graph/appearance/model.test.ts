import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GRAPH_APPEARANCE,
  resolveCssToken,
  resolveGraphAppearance,
} from '../../../../src/webview/components/graph/appearance/model';

let cssTokens: Record<string, string>;
let computedColors: Record<string, string>;

describe('graph/appearance/model', () => {
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

  it('resolves individual CSS tokens from the active document theme', () => {
    cssTokens['--cg-graph-background'] = 'var(--vscode-editor-background)';
    computedColors['--cg-graph-background'] = 'rgb(1, 2, 3)';

    expect(resolveCssToken('--cg-graph-background', 'Fallback')).toBe('rgb(1, 2, 3)');
  });

  it('uses the fallback when a CSS token is not present', () => {
    expect(resolveCssToken('--cg-graph-background', 'Fallback')).toBe('Fallback');
  });

  it('resolves graph rendering appearance from CodeGraphy theme tokens', () => {
    cssTokens = {
      '--cg-focus-border': 'var(--vscode-focusBorder)',
      '--cg-graph-label-foreground': 'var(--vscode-foreground)',
      '--cg-graph-label-muted-foreground': 'var(--vscode-descriptionForeground)',
      '--cg-graph-link-highlight': 'var(--cg-primary)',
      '--cg-graph-link-muted': 'var(--vscode-disabledForeground)',
      '--cg-graph-mesh-dimmed': 'var(--vscode-disabledForeground)',
      '--cg-graph-mesh-selected': 'var(--vscode-foreground)',
      '--cg-graph-node-selection-border': 'var(--vscode-contrastActiveBorder)',
      '--cg-graph-background': 'var(--cg-popover-translucent)',
      '--cg-graph-border': 'var(--vscode-panel-border)',
      '--cg-transparent': 'transparent',
    };
    computedColors = {
      '--cg-focus-border': 'rgb(1, 2, 3)',
      '--cg-graph-label-foreground': 'rgb(4, 5, 6)',
      '--cg-graph-label-muted-foreground': 'rgb(7, 8, 9)',
      '--cg-graph-link-highlight': 'rgb(10, 11, 12)',
      '--cg-graph-link-muted': 'rgb(13, 14, 15)',
      '--cg-graph-mesh-dimmed': 'rgb(16, 17, 18)',
      '--cg-graph-mesh-selected': 'rgb(19, 20, 21)',
      '--cg-graph-node-selection-border': 'rgb(22, 23, 24)',
      '--cg-graph-background': 'rgb(25, 26, 27)',
      '--cg-graph-border': 'rgb(28, 29, 30)',
      '--cg-transparent': 'rgba(0, 0, 0, 0)',
    };

    expect(resolveGraphAppearance()).toEqual({
      focusBorder: 'rgb(1, 2, 3)',
      labelForeground: 'rgb(4, 5, 6)',
      labelMutedForeground: 'rgb(7, 8, 9)',
      linkHighlight: 'rgb(10, 11, 12)',
      linkMuted: 'rgb(13, 14, 15)',
      nodeSelectionBorder: 'rgb(22, 23, 24)',
      stageBackground: 'var(--cg-popover-translucent)',
      stageBorder: 'rgb(28, 29, 30)',
      transparent: 'rgba(0, 0, 0, 0)',
    });
  });

  it('falls back to system colors when graph appearance tokens are missing', () => {
    expect(resolveGraphAppearance()).toEqual(DEFAULT_GRAPH_APPEARANCE);
  });
});

function readStyleToken(element: Element): string {
  const styleColor = (element as HTMLElement).style?.color ?? '';
  const match = styleColor.match(/^var\((--[^)]+)\)$/);
  return match?.[1] ?? '';
}
