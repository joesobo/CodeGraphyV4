import { describe, it, expect, vi } from 'vitest';
import { handleAltShortcuts } from '../../../src/webview/components/searchKeyboardAltShortcuts';

function makeEvent(init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', init);
  vi.spyOn(event, 'preventDefault');
  return event;
}

describe('handleAltShortcuts', () => {
  it('returns false when altKey is not pressed', () => {
    const toggleOption = vi.fn();
    const event = makeEvent({ key: 'c' });

    const result = handleAltShortcuts(event, toggleOption);

    expect(result).toBe(false);
    expect(toggleOption).not.toHaveBeenCalled();
  });

  it('toggles matchCase on Alt+C (lowercase)', () => {
    const toggleOption = vi.fn();
    const event = makeEvent({ altKey: true, key: 'c' });

    const result = handleAltShortcuts(event, toggleOption);

    expect(result).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(toggleOption).toHaveBeenCalledWith('matchCase');
  });

  it('toggles matchCase on Alt+C (uppercase)', () => {
    const toggleOption = vi.fn();
    const event = makeEvent({ altKey: true, key: 'C' });

    const result = handleAltShortcuts(event, toggleOption);

    expect(result).toBe(true);
    expect(toggleOption).toHaveBeenCalledWith('matchCase');
  });

  it('toggles wholeWord on Alt+W (lowercase)', () => {
    const toggleOption = vi.fn();
    const event = makeEvent({ altKey: true, key: 'w' });

    const result = handleAltShortcuts(event, toggleOption);

    expect(result).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(toggleOption).toHaveBeenCalledWith('wholeWord');
  });

  it('toggles wholeWord on Alt+W (uppercase)', () => {
    const toggleOption = vi.fn();
    const event = makeEvent({ altKey: true, key: 'W' });

    const result = handleAltShortcuts(event, toggleOption);

    expect(result).toBe(true);
    expect(toggleOption).toHaveBeenCalledWith('wholeWord');
  });

  it('toggles regex on Alt+R (lowercase)', () => {
    const toggleOption = vi.fn();
    const event = makeEvent({ altKey: true, key: 'r' });

    const result = handleAltShortcuts(event, toggleOption);

    expect(result).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(toggleOption).toHaveBeenCalledWith('regex');
  });

  it('toggles regex on Alt+R (uppercase)', () => {
    const toggleOption = vi.fn();
    const event = makeEvent({ altKey: true, key: 'R' });

    const result = handleAltShortcuts(event, toggleOption);

    expect(result).toBe(true);
    expect(toggleOption).toHaveBeenCalledWith('regex');
  });

  it('returns false for unrecognized Alt+key combinations', () => {
    const toggleOption = vi.fn();
    const event = makeEvent({ altKey: true, key: 'x' });

    const result = handleAltShortcuts(event, toggleOption);

    expect(result).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(toggleOption).not.toHaveBeenCalled();
  });
});
