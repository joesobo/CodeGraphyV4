import { describe, expect, it, vi } from 'vitest';
import { handleAltShortcuts } from '../../../../../src/webview/components/searchBar/field/altShortcuts';

function createEvent(key: string, altKey = true): KeyboardEvent {
  return {
    altKey,
    key,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

describe('handleAltShortcuts', () => {
  it('toggles matchCase on Alt+C', () => {
    const toggleOption = vi.fn();
    const event = createEvent('c');

    const handled = handleAltShortcuts(event, toggleOption);

    expect(handled).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(toggleOption).toHaveBeenCalledWith('matchCase');
  });

  it('toggles wholeWord on Alt+W', () => {
    const toggleOption = vi.fn();
    const event = createEvent('w');

    const handled = handleAltShortcuts(event, toggleOption);

    expect(handled).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(toggleOption).toHaveBeenCalledWith('wholeWord');
  });

  it('toggles regex on Alt+R', () => {
    const toggleOption = vi.fn();
    const event = createEvent('r');

    const handled = handleAltShortcuts(event, toggleOption);

    expect(handled).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(toggleOption).toHaveBeenCalledWith('regex');
  });

  it('returns false when Alt is not pressed', () => {
    const toggleOption = vi.fn();
    const event = createEvent('c', false);

    const handled = handleAltShortcuts(event, toggleOption);

    expect(handled).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(toggleOption).not.toHaveBeenCalled();
  });

  it('returns false for unrecognized Alt shortcuts', () => {
    const toggleOption = vi.fn();
    const event = createEvent('x');

    const handled = handleAltShortcuts(event, toggleOption);

    expect(handled).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(toggleOption).not.toHaveBeenCalled();
  });
});
