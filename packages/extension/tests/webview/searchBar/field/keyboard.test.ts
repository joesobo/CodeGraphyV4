import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  handleAltShortcuts,
  handleEscapeKey,
  handleFocusShortcut,
} from '../../../../src/webview/components/searchBar/field/keyboard';

function createInputRef() {
  const input = document.createElement('input');
  document.body.appendChild(input);

  return {
    current: input,
    input,
  };
}

function cleanupInput(input: HTMLInputElement) {
  input.remove();
}

describe('handleFocusShortcut', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses and selects the input on Ctrl+F', () => {
    const { current: input, input: element } = createInputRef();
    const event = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true });
    const focus = vi.spyOn(input, 'focus');
    const select = vi.spyOn(input, 'select');

    const handled = handleFocusShortcut(event, { current: input });

    expect(handled).toBe(true);
    expect(focus).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledOnce();
    cleanupInput(element);
  });

  it('focuses and selects the input on Meta+F', () => {
    const { current: input, input: element } = createInputRef();
    const event = new KeyboardEvent('keydown', { key: 'f', metaKey: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const focus = vi.spyOn(input, 'focus');
    const select = vi.spyOn(input, 'select');

    const handled = handleFocusShortcut(event, { current: input });

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledOnce();
    cleanupInput(element);
  });

  it('returns false for non-F keys', () => {
    const { current: input, input: element } = createInputRef();
    const event = new KeyboardEvent('keydown', { key: 'g', ctrlKey: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const focus = vi.spyOn(input, 'focus');
    const select = vi.spyOn(input, 'select');

    const handled = handleFocusShortcut(event, { current: input });

    expect(handled).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    cleanupInput(element);
  });

  it('returns false for F without a modifier', () => {
    const { current: input, input: element } = createInputRef();
    const event = new KeyboardEvent('keydown', { key: 'f' });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const focus = vi.spyOn(input, 'focus');
    const select = vi.spyOn(input, 'select');

    const handled = handleFocusShortcut(event, { current: input });

    expect(handled).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    cleanupInput(element);
  });

  it('does not throw when the input ref is empty', () => {
    const event = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true });

    expect(() => handleFocusShortcut(event, { current: null })).not.toThrow();
    expect(handleFocusShortcut(event, { current: null })).toBe(true);
  });
});

describe('handleEscapeKey', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clears and blurs the input when Escape is pressed while focused', () => {
    const { current: input, input: element } = createInputRef();
    const onChange = vi.fn();
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const blur = vi.spyOn(input, 'blur');

    input.focus();
    expect(document.activeElement).toBe(input);

    const handled = handleEscapeKey(event, { current: input }, onChange);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('');
    expect(blur).toHaveBeenCalledOnce();
    cleanupInput(element);
  });

  it('returns false when Escape is pressed on an unfocused input', () => {
    const { current: input, input: element } = createInputRef();
    const onChange = vi.fn();
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const blur = vi.spyOn(input, 'blur');

    const handled = handleEscapeKey(event, { current: input }, onChange);

    expect(handled).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(blur).not.toHaveBeenCalled();
    cleanupInput(element);
  });

  it('returns false for other keys even when focused', () => {
    const { current: input, input: element } = createInputRef();
    const onChange = vi.fn();
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const blur = vi.spyOn(input, 'blur');

    input.focus();

    const handled = handleEscapeKey(event, { current: input }, onChange);

    expect(handled).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(blur).not.toHaveBeenCalled();
    cleanupInput(element);
  });
});

describe('handleAltShortcuts', () => {
  it('handles Alt+C, Alt+W, and Alt+R shortcuts', () => {
    const toggleOption = vi.fn();

    const cEvent = new KeyboardEvent('keydown', { key: 'c', altKey: true });
    const wEvent = new KeyboardEvent('keydown', { key: 'w', altKey: true });
    const rEvent = new KeyboardEvent('keydown', { key: 'r', altKey: true });

    expect(handleAltShortcuts(cEvent, toggleOption)).toBe(true);
    expect(handleAltShortcuts(wEvent, toggleOption)).toBe(true);
    expect(handleAltShortcuts(rEvent, toggleOption)).toBe(true);

    expect(toggleOption).toHaveBeenNthCalledWith(1, 'matchCase');
    expect(toggleOption).toHaveBeenNthCalledWith(2, 'wholeWord');
    expect(toggleOption).toHaveBeenNthCalledWith(3, 'regex');
  });

  it('returns false when Alt is not pressed', () => {
    const toggleOption = vi.fn();
    const event = new KeyboardEvent('keydown', { key: 'c' });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    expect(handleAltShortcuts(event, toggleOption)).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(toggleOption).not.toHaveBeenCalled();
  });
});
