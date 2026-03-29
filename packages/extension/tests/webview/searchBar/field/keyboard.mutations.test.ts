import { describe, expect, it, vi } from 'vitest';
import { handleEscapeKey, handleFocusShortcut } from '../../../../src/webview/components/searchBar/field/keyboard';

function createInput() {
  const input = document.createElement('input');
  document.body.appendChild(input);
  return input;
}

describe('keyboard mutation guards', () => {
  it('keeps Ctrl+F and Meta+F focused shortcuts isolated from wrong keys', () => {
    const input = createInput();
    const ctrlEvent = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true });
    const metaEvent = new KeyboardEvent('keydown', { key: 'f', metaKey: true });
    const wrongKeyEvent = new KeyboardEvent('keydown', { key: 'g', ctrlKey: true });
    const noModifierEvent = new KeyboardEvent('keydown', { key: 'f' });
    const focus = vi.spyOn(input, 'focus');
    const select = vi.spyOn(input, 'select');

    expect(handleFocusShortcut(ctrlEvent, { current: input })).toBe(true);
    expect(handleFocusShortcut(metaEvent, { current: input })).toBe(true);
    expect(handleFocusShortcut(wrongKeyEvent, { current: input })).toBe(false);
    expect(handleFocusShortcut(noModifierEvent, { current: input })).toBe(false);
    expect(focus).toHaveBeenCalledTimes(2);
    expect(select).toHaveBeenCalledTimes(2);

    input.remove();
  });

  it('keeps Escape handling scoped to a focused input', () => {
    const input = createInput();
    const onChange = vi.fn();
    const focusedEscape = new KeyboardEvent('keydown', { key: 'Escape' });
    const unfocusedEscape = new KeyboardEvent('keydown', { key: 'Escape' });
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventDefault = vi.spyOn(focusedEscape, 'preventDefault');
    const blur = vi.spyOn(input, 'blur');

    input.focus();

    expect(handleEscapeKey(focusedEscape, { current: input }, onChange)).toBe(true);
    expect(onChange).toHaveBeenCalledWith('');
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(blur).toHaveBeenCalledOnce();

    onChange.mockClear();
    preventDefault.mockClear();
    blur.mockClear();

    expect(handleEscapeKey(unfocusedEscape, { current: input }, onChange)).toBe(false);
    expect(handleEscapeKey(enterEvent, { current: input }, onChange)).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
    expect(blur).not.toHaveBeenCalled();

    input.remove();
  });

  it('handles Escape when the ref is empty and the document has no active element', () => {
    const onChange = vi.fn();
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    const activeElement = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(null);

    expect(handleEscapeKey(event, { current: null }, onChange)).toBe(true);
    expect(onChange).toHaveBeenCalledWith('');
    expect(activeElement).toHaveBeenCalled();
  });
});
