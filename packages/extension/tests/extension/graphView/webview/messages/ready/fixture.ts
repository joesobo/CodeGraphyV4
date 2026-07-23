import { vi } from 'vitest';

export function createHandlers() {
  return {
    getGraphData: vi.fn(() => ({
      nodes: [{ id: 'cached.ts', label: 'cached.ts', color: '#ffffff' }],
      edges: [],
    })),
    getFilterPatterns: vi.fn(() => ['dist/**']),
    getPluginFilterPatterns: vi.fn(() => ['venv/**']),
    getPluginFilterGroups: vi.fn(() => []),
    getConfig: vi.fn(<T>(_key: string, defaultValue: T): T => defaultValue),
    loadGroupsAndFilterPatterns: vi.fn(),
    loadDisabledRulesAndPlugins: vi.fn(),
    sendDepthState: vi.fn(),
    sendGraphControls: vi.fn(),
    loadAndSendData: vi.fn(),
    sendFavorites: vi.fn(),
    sendSettings: vi.fn(),
    sendPhysicsSettings: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    sendMessage: vi.fn(),
    sendDecorations: vi.fn(),
    sendPluginStatuses: vi.fn(),
    sendPluginWebviewInjections: vi.fn(),
    sendActiveFile: vi.fn(),
    waitForFirstWorkspaceReady: vi.fn(() => Promise.resolve()),
    notifyWebviewReady: vi.fn(),
  };
}
