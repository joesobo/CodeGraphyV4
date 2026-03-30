import { renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const useSearchKeyboardHarness = vi.hoisted(() => ({
  useSearchKeyboard: vi.fn(),
}));

vi.mock('../../../../../src/webview/components/searchBar/field/useKeyboard', () => ({
  useSearchKeyboard: useSearchKeyboardHarness.useSearchKeyboard,
}));

import { useSearchBarHandlers } from '../../../../../src/webview/components/searchBar/field/handlers';
import type { SearchOptions } from '../../../../../src/webview/components/searchBar/field/model';

describe('useSearchBarHandlers', () => {
  beforeEach(() => {
    useSearchKeyboardHarness.useSearchKeyboard.mockReset();
  });

  it('passes the input ref and callbacks to useSearchKeyboard', () => {
    const options: SearchOptions = { matchCase: false, wholeWord: true, regex: false };
    const onOptionsChange = vi.fn();
    const onChange = vi.fn();

    const { result } = renderHook(() => useSearchBarHandlers(options, onOptionsChange, onChange));

    expect(result.current.inputRef.current).toBeNull();
    expect(useSearchKeyboardHarness.useSearchKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({
        inputRef: result.current.inputRef,
        onChange,
        toggleOption: expect.any(Function),
      }),
    );
  });

  it('toggles an option from the current options snapshot', () => {
    const options: SearchOptions = { matchCase: false, wholeWord: true, regex: false };
    const onOptionsChange = vi.fn();

    const { result } = renderHook(() => useSearchBarHandlers(options, onOptionsChange, vi.fn()));

    result.current.toggleOption('matchCase');

    expect(onOptionsChange).toHaveBeenCalledWith({ matchCase: true, wholeWord: true, regex: false });
  });

  it('focuses the input after clearing the search value', () => {
    const options: SearchOptions = { matchCase: false, wholeWord: false, regex: false };
    const onChange = vi.fn();
    const focus = vi.fn();

    const { result } = renderHook(() => useSearchBarHandlers(options, vi.fn(), onChange));
    const inputRef = result.current.inputRef as MutableRefObject<HTMLInputElement | null>;
    inputRef.current = { focus } as unknown as HTMLInputElement;

    result.current.handleClear();

    expect(onChange).toHaveBeenCalledWith('');
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('uses the latest options after rerendering', () => {
    const onOptionsChange = vi.fn();
    const onChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ options }: { options: SearchOptions }) => useSearchBarHandlers(options, onOptionsChange, onChange),
      {
        initialProps: {
          options: { matchCase: false, wholeWord: false, regex: false } satisfies SearchOptions,
        },
      },
    );

    const nextOptions: SearchOptions = { matchCase: true, wholeWord: false, regex: true };
    rerender({ options: nextOptions } as never);

    result.current.toggleOption('regex');

    expect(onOptionsChange).toHaveBeenCalledWith({ matchCase: true, wholeWord: false, regex: false });
  });

  it('uses the latest onChange after rerendering', () => {
    const onOptionsChange = vi.fn();
    const firstOnChange = vi.fn();
    const secondOnChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ onChange }) => useSearchBarHandlers(
        { matchCase: false, wholeWord: false, regex: false },
        onOptionsChange,
        onChange,
      ),
      {
        initialProps: {
          onChange: firstOnChange,
        },
      },
    );

    rerender({
      onChange: secondOnChange,
    });

    result.current.handleClear();

    expect(firstOnChange).not.toHaveBeenCalled();
    expect(secondOnChange).toHaveBeenCalledWith('');
  });

  it('does not throw when clearing without an input element', () => {
    const { result } = renderHook(() => useSearchBarHandlers(
      { matchCase: false, wholeWord: false, regex: false },
      vi.fn(),
      vi.fn(),
    ));

    expect(() => result.current.handleClear()).not.toThrow();
  });
});
