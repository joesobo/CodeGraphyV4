import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_DESKTOP_INTERFACE_PREFERENCES,
  DESKTOP_INTERFACE_PREFERENCES_KEY,
  parseDesktopInterfacePreferences,
  readDesktopInterfacePreferences,
  saveDesktopInterfacePreferences,
} from './interfacePreferences';

describe('desktop interface preferences', () => {
  it('accepts only the complete pane and profiling record', () => {
    const preferences = {
      filesPaneVisible: false,
      graphPaneVisible: true,
      profilingVisible: true,
    };

    expect(parseDesktopInterfacePreferences(preferences)).toEqual(preferences);
    expect(parseDesktopInterfacePreferences({ graphPaneVisible: false })).toEqual(
      DEFAULT_DESKTOP_INTERFACE_PREFERENCES,
    );
    expect(parseDesktopInterfacePreferences({ ...preferences, extra: true })).toEqual(
      DEFAULT_DESKTOP_INTERFACE_PREFERENCES,
    );
  });

  it('persists one local interface record and rejects invalid storage', () => {
    const setItem = vi.fn();
    const preferences = {
      filesPaneVisible: true,
      graphPaneVisible: false,
      profilingVisible: true,
    };

    saveDesktopInterfacePreferences({ setItem }, preferences);

    expect(setItem).toHaveBeenCalledWith(
      DESKTOP_INTERFACE_PREFERENCES_KEY,
      JSON.stringify(preferences),
    );
    expect(readDesktopInterfacePreferences({ getItem: () => JSON.stringify(preferences) }))
      .toEqual(preferences);
    expect(readDesktopInterfacePreferences({ getItem: () => '{broken' }))
      .toEqual(DEFAULT_DESKTOP_INTERFACE_PREFERENCES);
  });
});
