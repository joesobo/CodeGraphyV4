import { vi } from 'vitest';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../../../../../src/extension/graphView/webview/settingsMessages/router';

export function createState(
  overrides: Partial<GraphViewSettingsMessageState> = {},
): GraphViewSettingsMessageState {
  return {
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
    recomputeGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    getPluginFilterPatterns: vi.fn(() => []),
    getPluginFilterGroups: vi.fn(() => []),
    sendGraphControls: vi.fn(),
    reloadCachedGraph: vi.fn(() => Promise.resolve()),
    smartRebuild: vi.fn(),
    hydrateGraphScope: vi.fn(() => Promise.resolve(false)),
    hydratePluginGraphScope: vi.fn(() => Promise.resolve(false)),
    sendMessage: vi.fn(),
    resetAllSettings: vi.fn(() => Promise.resolve()),
    ...overrides,
  };

  handlers.sendGraphControls ??= vi.fn();

  return handlers as GraphViewSettingsMessageHandlers;
}
