import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useSearchKeyboard } from '../../src/webview/hooks/useSearchKeyboard';

function makeInputRef() {
  const input = document.createElement('input');
  document.body.appendChild(input);
  return { current: input };
}

describe('useSearchKeyboard', () => {
  let onChange: ReturnType<typeof vi.fn>;
  let toggleOption: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
    toggleOption = vi.fn();
  });

  it('calls toggleOption with matchCase when Alt+C is pressed', () => {
    const inputRef = makeInputRef();
    renderHook(() => useSearchKeyboard({ inputRef, onChange, toggleOption }));

    fireEvent.keyDown(window, { key: 'c', altKey: true });

    expect(toggleOption).toHaveBeenCalledWith('matchCase');
  });

  it('calls toggleOption with wholeWord when Alt+W is pressed', () => {
    const inputRef = makeInputRef();
    renderHook(() => useSearchKeyboard({ inputRef, onChange, toggleOption }));

    fireEvent.keyDown(window, { key: 'w', altKey: true });

    expect(toggleOption).toHaveBeenCalledWith('wholeWord');
  });

  it('calls toggleOption with regex when Alt+R is pressed', () => {
    const inputRef = makeInputRef();
    renderHook(() => useSearchKeyboard({ inputRef, onChange, toggleOption }));

    fireEvent.keyDown(window, { key: 'r', altKey: true });

    expect(toggleOption).toHaveBeenCalledWith('regex');
  });

  it('calls onChange with empty string when Escape is pressed while input is focused', () => {
    const inputRef = makeInputRef();
    inputRef.current.focus();
    renderHook(() => useSearchKeyboard({ inputRef, onChange, toggleOption }));

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('does not call onChange when Escape is pressed while input is not focused', () => {
    const inputRef = makeInputRef();
    // Make sure the input is NOT focused
    inputRef.current.blur();
    renderHook(() => useSearchKeyboard({ inputRef, onChange, toggleOption }));

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes the keydown listener on cleanup', () => {
    const inputRef = makeInputRef();
    const { unmount } = renderHook(() => useSearchKeyboard({ inputRef, onChange, toggleOption }));

    unmount();

    fireEvent.keyDown(window, { key: 'c', altKey: true });
    expect(toggleOption).not.toHaveBeenCalled();
  });

  it('handles uppercase key for Alt+C shortcut (case-insensitive match)', () => {
    const inputRef = makeInputRef();
    renderHook(() => useSearchKeyboard({ inputRef, onChange, toggleOption }));

    fireEvent.keyDown(window, { key: 'C', altKey: true });

    expect(toggleOption).toHaveBeenCalledWith('matchCase');
  });
});
