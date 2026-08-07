export interface DesktopInterfacePreferences {
  filesPaneVisible: boolean;
  graphPaneVisible: boolean;
  profilingVisible: boolean;
}

export const DEFAULT_DESKTOP_INTERFACE_PREFERENCES: DesktopInterfacePreferences = {
  filesPaneVisible: true,
  graphPaneVisible: true,
  profilingVisible: false,
};
export const DESKTOP_INTERFACE_PREFERENCES_KEY = 'codegraphy.desktop.interface-preferences';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseDesktopInterfacePreferences(value: unknown): DesktopInterfacePreferences {
  if (!isRecord(value)
    || Object.keys(value).sort().join(',') !== 'filesPaneVisible,graphPaneVisible,profilingVisible'
    || typeof value.filesPaneVisible !== 'boolean'
    || typeof value.graphPaneVisible !== 'boolean'
    || typeof value.profilingVisible !== 'boolean') {
    return { ...DEFAULT_DESKTOP_INTERFACE_PREFERENCES };
  }
  return {
    filesPaneVisible: value.filesPaneVisible,
    graphPaneVisible: value.graphPaneVisible,
    profilingVisible: value.profilingVisible,
  };
}

export function readDesktopInterfacePreferences(
  storage: Pick<Storage, 'getItem'>,
): DesktopInterfacePreferences {
  const stored = storage.getItem(DESKTOP_INTERFACE_PREFERENCES_KEY);
  if (stored === null) return { ...DEFAULT_DESKTOP_INTERFACE_PREFERENCES };
  try {
    return parseDesktopInterfacePreferences(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_DESKTOP_INTERFACE_PREFERENCES };
  }
}

export function saveDesktopInterfacePreferences(
  storage: Pick<Storage, 'setItem'>,
  preferences: DesktopInterfacePreferences,
): void {
  storage.setItem(DESKTOP_INTERFACE_PREFERENCES_KEY, JSON.stringify(preferences));
}
