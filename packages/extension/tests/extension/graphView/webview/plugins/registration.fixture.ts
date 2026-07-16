import { vi } from 'vitest';
import * as vscode from 'vscode';
import type { GraphViewExternalPluginRegistrationState } from '../../../../../src/extension/graphView/webview/plugins/registration/register';

export { vscode };

export function createState(
  overrides: Partial<GraphViewExternalPluginRegistrationState> = {},
): GraphViewExternalPluginRegistrationState {
  return {
    pluginExtensionUris: new Map<string, vscode.Uri>(),
    firstAnalysis: true,
    readyNotified: false,
    analyzerInitialized: true,
    analyzerInitPromise: undefined,
    analyzer: {
      clearCache: vi.fn(),
      registry: {
        register: vi.fn(),
        initializePlugin: vi.fn(async () => undefined),
        replayReadinessForPlugin: vi.fn(),
      },
    },
    ...overrides,
  };
}

export function createHandlers(overrides: Record<string, unknown> = {}) {
  return {
    normalizeExtensionUri: () => undefined,
    getWorkspaceRoot: () => '/test/workspace',
    refreshWebviewResourceRoots: vi.fn(),
    sendDepthState: vi.fn(),
    sendPluginStatuses: vi.fn(),
    sendContextMenuItems: vi.fn(),
    sendPluginWebviewInjections: vi.fn(),
    reprocessPluginFiles: vi.fn(async () => undefined),
    ...overrides,
  };
}

export async function flushPluginRegistration(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

