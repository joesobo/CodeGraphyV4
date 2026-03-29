import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { detectTheme } from '../../../src/webview/theme/brightness';

let editorBackground = '';

function setEditorBackground(value: string): void {
  editorBackground = value;
}

describe('detectTheme', () => {
  beforeEach(() => {
    editorBackground = '';
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({
      getPropertyValue: (prop: string) => {
        if (prop === '--vscode-editor-background') return editorBackground;
        return '';
      },
    } as CSSStyleDeclaration));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns dark when the editor background is empty', () => {
    setEditorBackground('');
    expect(detectTheme()).toBe('dark');
  });

  it('returns dark when the editor background is only whitespace', () => {
    setEditorBackground('   ');
    expect(detectTheme()).toBe('dark');
  });

  it('returns dark when the color cannot be parsed', () => {
    setEditorBackground('not-a-color');
    expect(detectTheme()).toBe('dark');
  });

  it('returns light for bright hex backgrounds above brightness 128', () => {
    setEditorBackground('#d0d0d0');
    expect(detectTheme()).toBe('light');
  });

  it('returns dark for hex backgrounds with brightness below 128', () => {
    setEditorBackground('#404040');
    expect(detectTheme()).toBe('dark');
  });

  it('returns high-contrast for very dark backgrounds with brightness below 30', () => {
    setEditorBackground('#0c0c0c');
    expect(detectTheme()).toBe('high-contrast');
  });

  it('returns high-contrast for very bright backgrounds with brightness above 240', () => {
    setEditorBackground('#f8f8f8');
    expect(detectTheme()).toBe('high-contrast');
  });

  it('returns dark at the exact boundary brightness of 30', () => {
    setEditorBackground('#1e1e1e');
    expect(detectTheme()).toBe('dark');
  });

  it('returns high-contrast at brightness 29', () => {
    setEditorBackground('#1d1d1d');
    expect(detectTheme()).toBe('high-contrast');
  });

  it('returns light at brightness 240', () => {
    setEditorBackground('#f0f0f0');
    expect(detectTheme()).toBe('light');
  });

  it('returns high-contrast at brightness 241', () => {
    setEditorBackground('#f1f1f1');
    expect(detectTheme()).toBe('high-contrast');
  });

  it('returns light at brightness 129', () => {
    setEditorBackground('#818181');
    expect(detectTheme()).toBe('light');
  });

  it('returns dark at brightness 128', () => {
    setEditorBackground('#808080');
    expect(detectTheme()).toBe('dark');
  });

  it('parses rgb() format backgrounds', () => {
    setEditorBackground('rgb(12, 12, 12)');
    expect(detectTheme()).toBe('high-contrast');
  });

  it('parses rgba() format backgrounds', () => {
    setEditorBackground('rgba(200, 200, 200, 1.0)');
    expect(detectTheme()).toBe('light');
  });
});
