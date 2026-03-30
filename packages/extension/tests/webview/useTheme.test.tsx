import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adjustColorForLightTheme, useTheme } from '../../src/webview/theme/useTheme';

let editorBackground = '';
let mutationCallback: MutationCallback | null = null;
const observeSpy = vi.fn();
const disconnectSpy = vi.fn();

class MockMutationObserver {
  constructor(callback: MutationCallback) {
    mutationCallback = callback;
  }

  observe = observeSpy;
  disconnect = disconnectSpy;
}

function setEditorBackground(value: string): void {
  editorBackground = value;
}

describe('useTheme', () => {
  beforeEach(() => {
    editorBackground = '';
    mutationCallback = null;
    observeSpy.mockClear();
    disconnectSpy.mockClear();
    vi.stubGlobal('MutationObserver', MockMutationObserver as unknown as typeof MutationObserver);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({
      getPropertyValue: () => editorBackground,
    } as unknown as CSSStyleDeclaration));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to dark when the editor background is missing', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe('dark');
  });

  it('detects light themes from bright hex backgrounds', () => {
    setEditorBackground('#d0d0d0');

    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe('light');
  });

  it('detects high-contrast themes from very dark rgb backgrounds', () => {
    setEditorBackground('rgb(12, 12, 12)');

    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe('high-contrast');
  });

  it('falls back to dark when the background color cannot be parsed', () => {
    setEditorBackground('not-a-color');

    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe('dark');
  });

  it('updates the theme from extension theme-changed messages', () => {
    setEditorBackground('#1e1e1e');
    const { result } = renderHook(() => useTheme());

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'THEME_CHANGED', payload: { kind: 'light' } },
      }));
    });

    expect(result.current).toBe('light');
  });

  it('ignores invalid extension theme messages', () => {
    setEditorBackground('#1e1e1e');
    const { result } = renderHook(() => useTheme());

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'THEME_CHANGED', payload: { kind: 'sepia' } },
      }));
    });

    expect(result.current).toBe('dark');
  });

  it('re-detects the theme when observed body attributes change', () => {
    setEditorBackground('#1e1e1e');
    const { result } = renderHook(() => useTheme());

    setEditorBackground('#d0d0d0');
    act(() => {
      mutationCallback?.([], {} as MutationObserver);
    });

    expect(result.current).toBe('light');
  });

  it('disconnects the mutation observer on unmount', () => {
    const { unmount } = renderHook(() => useTheme());

    unmount();

    expect(observeSpy).toHaveBeenCalledWith(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('darkens valid hex colors for light themes', () => {
    expect(adjustColorForLightTheme('#80c0ff')).toBe('#5a86b3');
  });

  it('returns invalid colors unchanged', () => {
    expect(adjustColorForLightTheme('not-a-color')).toBe('not-a-color');
  });

  it('removes the message listener on unmount', () => {
    const removeEventSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useTheme());

    unmount();

    expect(removeEventSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('adds a message listener on mount', () => {
    const addEventSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useTheme());

    expect(addEventSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('ignores messages that are not THEME_CHANGED', () => {
    setEditorBackground('#1e1e1e');
    const { result } = renderHook(() => useTheme());

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'OTHER_MESSAGE', payload: { kind: 'light' } },
      }));
    });

    expect(result.current).toBe('dark');
  });

  it('detects dark from a standard dark hex background', () => {
    setEditorBackground('#2d2d2d');

    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe('dark');
  });
});
