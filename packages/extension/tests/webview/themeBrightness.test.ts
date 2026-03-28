import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { detectTheme } from '../../src/webview/themeBrightness';

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
    // #d0d0d0 => r=208, g=208, b=208 => brightness = (208*299 + 208*587 + 208*114) / 1000 = 208
    setEditorBackground('#d0d0d0');
    expect(detectTheme()).toBe('light');
  });

  it('returns dark for hex backgrounds with brightness below 128', () => {
    // #1e1e1e => r=30, g=30, b=30 => brightness = 30
    // But brightness 30 is exactly the boundary for high-contrast (< 30 is HC).
    // Actually 30 is not < 30, so it falls through to brightness > 128 check => dark
    setEditorBackground('#404040');
    // #404040 => r=64, g=64, b=64 => brightness = 64
    expect(detectTheme()).toBe('dark');
  });

  it('returns high-contrast for very dark backgrounds with brightness below 30', () => {
    // #0c0c0c => r=12, g=12, b=12 => brightness = 12
    setEditorBackground('#0c0c0c');
    expect(detectTheme()).toBe('high-contrast');
  });

  it('returns high-contrast for very bright backgrounds with brightness above 240', () => {
    // #f8f8f8 => r=248, g=248, b=248 => brightness = 248
    setEditorBackground('#f8f8f8');
    expect(detectTheme()).toBe('high-contrast');
  });

  it('returns dark at the exact boundary brightness of 30', () => {
    // Need brightness exactly 30: (r*299 + g*587 + b*114) / 1000 = 30
    // r=g=b=30 => (30*299 + 30*587 + 30*114) / 1000 = 30*1000/1000 = 30
    // brightness = 30 is NOT < 30, and NOT > 240, so falls through
    // brightness 30 is NOT > 128, so returns 'dark'
    setEditorBackground('#1e1e1e');
    expect(detectTheme()).toBe('dark');
  });

  it('returns high-contrast at brightness 29 (just below 30)', () => {
    // r=g=b=29 => brightness = 29 < 30 => high-contrast
    setEditorBackground('#1d1d1d');
    expect(detectTheme()).toBe('high-contrast');
  });

  it('returns light at brightness 240 (not > 240)', () => {
    // r=g=b=240 => brightness = 240, which is NOT > 240
    // brightness > 128 => light
    setEditorBackground('#f0f0f0');
    expect(detectTheme()).toBe('light');
  });

  it('returns high-contrast at brightness 241 (just above 240)', () => {
    // r=g=b=241 => brightness = 241 > 240 => high-contrast
    setEditorBackground('#f1f1f1');
    expect(detectTheme()).toBe('high-contrast');
  });

  it('returns light at brightness 129 (just above 128)', () => {
    // r=g=b=129 => brightness = 129 > 128 => light
    setEditorBackground('#818181');
    expect(detectTheme()).toBe('light');
  });

  it('returns dark at brightness 128 (not > 128)', () => {
    // r=g=b=128 => brightness = 128, which is NOT > 128
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
