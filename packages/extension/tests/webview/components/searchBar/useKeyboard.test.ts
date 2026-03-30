import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useSearchKeyboard } from '../../../../src/webview/components/searchBar/field/useKeyboard';

function fireKeyDown(opts: Partial<KeyboardEventInit>): void {
  window.dispatchEvent(new KeyboardEvent('keydown', opts));
}

describe('useSearchKeyboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('focuses and selects the input on Ctrl+F', () => {
    const focus = vi.fn();
    const select = vi.fn();
    const onChange = vi.fn();
    const toggleOption = vi.fn();

    const { result } = renderHook(() => {
      const ref = useRef<HTMLInputElement>({ focus, select } as unknown as HTMLInputElement);
      useSearchKeyboard({ inputRef: ref, onChange, toggleOption });
      return ref;
    });

    expect(result.current).toBeDefined();
    fireKeyDown({ ctrlKey: true, key: 'f' });

    expect(focus).toHaveBeenCalled();
    expect(select).toHaveBeenCalled();
  });

  it('calls toggleOption with matchCase on Alt+C', () => {
    const toggleOption = vi.fn();

    renderHook(() => {
      const ref = useRef<HTMLInputElement>(null);
      useSearchKeyboard({ inputRef: ref, onChange: vi.fn(), toggleOption });
    });

    fireKeyDown({ altKey: true, key: 'c' });

    expect(toggleOption).toHaveBeenCalledWith('matchCase');
  });

  it('calls toggleOption with wholeWord on Alt+W', () => {
    const toggleOption = vi.fn();

    renderHook(() => {
      const ref = useRef<HTMLInputElement>(null);
      useSearchKeyboard({ inputRef: ref, onChange: vi.fn(), toggleOption });
    });

    fireKeyDown({ altKey: true, key: 'w' });

    expect(toggleOption).toHaveBeenCalledWith('wholeWord');
  });

  it('calls toggleOption with regex on Alt+R', () => {
    const toggleOption = vi.fn();

    renderHook(() => {
      const ref = useRef<HTMLInputElement>(null);
      useSearchKeyboard({ inputRef: ref, onChange: vi.fn(), toggleOption });
    });

    fireKeyDown({ altKey: true, key: 'r' });

    expect(toggleOption).toHaveBeenCalledWith('regex');
  });

  it('clears and blurs the input on Escape when focused', () => {
    const blur = vi.fn();
    const onChange = vi.fn();
    const fakeInput = { blur, focus: vi.fn(), select: vi.fn() } as unknown as HTMLInputElement;

    renderHook(() => {
      const ref = useRef<HTMLInputElement>(fakeInput);
      useSearchKeyboard({ inputRef: ref, onChange, toggleOption: vi.fn() });
    });

    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(fakeInput as unknown as Element);
    fireKeyDown({ key: 'Escape' });

    expect(onChange).toHaveBeenCalledWith('');
    expect(blur).toHaveBeenCalled();
  });

  it('removes the event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLInputElement>(null);
      useSearchKeyboard({ inputRef: ref, onChange: vi.fn(), toggleOption: vi.fn() });
    });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
