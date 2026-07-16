import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessageSettingsContext,
} from '../../../../../../src/extension/graphView/webview/providerMessages/settingsContext/create';
import * as repoSettings from '../../../../../../src/extension/repoSettings/current';

function createDeferred<T = void>(): {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

vi.mock('../../../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: vi.fn(),
  updateCodeGraphyConfigurationSilently: vi.fn(() => Promise.resolve()),
}));

describe('graph view provider listener settings context plugin reload', () => {
  it('keeps the analyzer initialized after reloading workspace plugins', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);

    const source = {
      _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
      _analyzerInitialized: true,
      _analyzerInitPromise: Promise.resolve(),
      _analyzer: {
        reloadWorkspacePlugins: vi.fn(() => Promise.resolve()),
      },
      _nodeSizeMode: 'connections',
      _getPhysicsSettings: vi.fn(() => ({
        repelForce: 1,
        linkDistance: 2,
        linkForce: 3,
        damping: 4,
        centerForce: 5,
      })),
      _sendMessage: vi.fn(),
      _sendAllSettings: vi.fn(),
      _analyzeAndSendData: vi.fn(() => Promise.resolve()),
    };

    const context = createGraphViewProviderMessageSettingsContext(
      source as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await context.reloadWorkspacePlugins();

    expect(source._analyzer.reloadWorkspacePlugins).toHaveBeenCalledOnce();
    expect(source._analyzerInitialized).toBe(true);
    expect(source._analyzerInitPromise).toBeUndefined();
  });

  it('exposes the in-flight workspace plugin reload as the analyzer init promise', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);
    const reload = createDeferred();

    const source = {
      _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
      _analyzerInitialized: true,
      _analyzerInitPromise: undefined as Promise<void> | undefined,
      _analyzer: {
        reloadWorkspacePlugins: vi.fn(() => reload.promise),
      },
      _nodeSizeMode: 'connections',
      _getPhysicsSettings: vi.fn(() => ({
        repelForce: 1,
        linkDistance: 2,
        linkForce: 3,
        damping: 4,
        centerForce: 5,
      })),
      _sendMessage: vi.fn(),
      _sendAllSettings: vi.fn(),
      _analyzeAndSendData: vi.fn(() => Promise.resolve()),
    };

    const context = createGraphViewProviderMessageSettingsContext(
      source as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    const pendingReload = context.reloadWorkspacePlugins();

    expect(source._analyzerInitialized).toBe(false);
    expect(source._analyzerInitPromise).toBe(pendingReload);

    reload.resolve(undefined);
    await pendingReload;

    expect(source._analyzerInitialized).toBe(true);
    expect(source._analyzerInitPromise).toBeUndefined();
  });

});
