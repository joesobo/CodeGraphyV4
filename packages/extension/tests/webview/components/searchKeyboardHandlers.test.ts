import { describe, it, expect, vi } from 'vitest';
import type { RefObject } from 'react';
import {
  handleFocusShortcut,
  handleEscapeKey,
} from '../../../src/webview/components/searchKeyboardHandlers';

function makeInputRef(overrides: Partial<HTMLInputElement> = {}): RefObject<HTMLInputElement | null> {
  return {
    current: {
      focus: vi.fn(),
      select: vi.fn(),
      blur: vi.fn(),
      ...overrides,
    } as unknown as HTMLInputElement,
  };
}

function makeEvent(init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', init);
  vi.spyOn(event, 'preventDefault');
  return event;
}

describe('handleFocusShortcut', () => {
  it('returns true and focuses input on Ctrl+F', () => {
    const ref = makeInputRef();
    const event = makeEvent({ ctrlKey: true, key: 'f' });

    const result = handleFocusShortcut(event, ref);

    expect(result).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(ref.current!.focus).toHaveBeenCalled();
    expect(ref.current!.select).toHaveBeenCalled();
  });

  it('returns true and focuses input on Meta+F (macOS)', () => {
    const ref = makeInputRef();
    const event = makeEvent({ metaKey: true, key: 'f' });

    const result = handleFocusShortcut(event, ref);

    expect(result).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(ref.current!.focus).toHaveBeenCalled();
  });

  it('returns false when key is not f', () => {
    const ref = makeInputRef();
    const event = makeEvent({ ctrlKey: true, key: 'g' });

    const result = handleFocusShortcut(event, ref);

    expect(result).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('returns false when neither ctrl nor meta is pressed', () => {
    const ref = makeInputRef();
    const event = makeEvent({ key: 'f' });

    const result = handleFocusShortcut(event, ref);

    expect(result).toBe(false);
  });

  it('handles null input ref without throwing', () => {
    const ref: RefObject<HTMLInputElement | null> = { current: null };
    const event = makeEvent({ ctrlKey: true, key: 'f' });

    const result = handleFocusShortcut(event, ref);

    expect(result).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
  });
});

describe('handleEscapeKey', () => {
  it('returns true and clears input when Escape is pressed while input is focused', () => {
    const ref = makeInputRef();
    const onChange = vi.fn();
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(ref.current as unknown as Element);
    const event = makeEvent({ key: 'Escape' });

    const result = handleEscapeKey(event, ref, onChange);

    expect(result).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith('');
    expect(ref.current!.blur).toHaveBeenCalled();
  });

  it('returns false when key is not Escape', () => {
    const ref = makeInputRef();
    const onChange = vi.fn();
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(ref.current as unknown as Element);
    const event = makeEvent({ key: 'Enter' });

    const result = handleEscapeKey(event, ref, onChange);

    expect(result).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('returns false when input is not the active element', () => {
    const ref = makeInputRef();
    const onChange = vi.fn();
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(document.body);
    const event = makeEvent({ key: 'Escape' });

    const result = handleEscapeKey(event, ref, onChange);

    expect(result).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('handles null input ref without throwing', () => {
    const ref: RefObject<HTMLInputElement | null> = { current: null };
    const onChange = vi.fn();
    const event = makeEvent({ key: 'Escape' });

    const result = handleEscapeKey(event, ref, onChange);

    expect(result).toBe(false);
  });
});
