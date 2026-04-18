import { vi } from 'vitest';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../../../../../src/extension/graphView/webview/settingsMessages/router';

export function createState(
  overrides: Partial<GraphViewSettingsMessageState> = {},
): GraphViewSettingsMessageState {
  return {
    disabledPlugins: new Set<string>(),
    filterPatterns: [],
    ...overrides,
  };
}

export function createHandlers(
  overrides: Partial<GraphViewSettingsMessageHandlers> = {},
): GraphViewSettingsMessageHandlers {
  const handlers = {
    getConfig: vi.fn(<T>(_: string, defaultValue: T): T => defaultValue),
    updateConfig: vi.fn(() => Promise.resolve()),
    getPluginFilterPatterns: vi.fn(() => []),
    sendGraphControls: vi.fn(),
    reprocessPluginFiles: vi.fn(() => Promise.resolve()),
    sendMessage: vi.fn(),
    resetAllSettings: vi.fn(() => Promise.resolve()),
    ...overrides,
  };

  handlers.sendGraphControls ??= vi.fn();

  return handlers as GraphViewSettingsMessageHandlers;
}
