import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as VSCode from 'vscode';
import type { PendingWorkspaceRefreshState } from '../../../../../src/extension/graphView/provider/runtime/workspaceRefreshPersistence';
import { createContext, createRestoredState, loadSubject, unmockRuntimeModules } from './fixture';

describe('graphView/provider/runtime workspace refresh', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    unmockRuntimeModules();
    vi.resetModules();
  });

  it('returns no persisted workspace refresh when there is no workspace root', async () => {
    vi.doMock('../../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices: vi.fn(),
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));

    const { GraphViewProvider, vscodeModule } = await loadSubject(undefined);
    const provider = new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    ) as unknown as {
      _loadPersistedWorkspaceRefresh(): unknown;
    };

    expect(provider._loadPersistedWorkspaceRefresh()).toBeUndefined();
  });

  it('returns no persisted workspace refresh when repo metadata has no pending files', async () => {
    vi.doMock('../../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices: vi.fn(),
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));
    vi.doMock('../../../../../src/extension/repoSettings/meta', () => ({
      readCodeGraphyRepoMeta: vi.fn(() => ({ pendingChangedFiles: [] })),
      writeCodeGraphyRepoMeta: vi.fn(),
    }));

    const { GraphViewProvider, vscodeModule } = await loadSubject([
      {
        uri: { fsPath: '/test/workspace', path: '/test/workspace' },
        name: 'workspace',
        index: 0,
      },
    ]);
    const provider = new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    ) as unknown as {
      _loadPersistedWorkspaceRefresh(): unknown;
    };

    expect(provider._loadPersistedWorkspaceRefresh()).toBeUndefined();
  });

  it('loads persisted workspace refresh state from repo metadata', async () => {
    vi.doMock('../../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices: vi.fn(),
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));
    vi.doMock('../../../../../src/extension/repoSettings/meta', () => ({
      readCodeGraphyRepoMeta: vi.fn(() => ({
        pendingChangedFiles: ['src/a.ts', 'src/b.ts'],
      })),
      writeCodeGraphyRepoMeta: vi.fn(),
    }));

    const { GraphViewProvider, vscodeModule } = await loadSubject([
      {
        uri: { fsPath: '/test/workspace', path: '/test/workspace' },
        name: 'workspace',
        index: 0,
      },
    ]);
    const provider = new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    ) as unknown as {
      _loadPersistedWorkspaceRefresh(): PendingWorkspaceRefreshState | undefined;
    };

    expect(provider._loadPersistedWorkspaceRefresh()).toEqual({
      filePaths: new Set(['src/a.ts', 'src/b.ts']),
      gitignoreRefresh: false,
      logMessage: '[CodeGraphy] Applying pending workspace changes',
    });
  });

  it('flushes queued workspace changes through the incremental refresh path', async () => {
    vi.doMock('../../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices: vi.fn(),
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));

    const { GraphViewProvider, methodContainers, vscodeModule } = await loadSubject([
      {
        uri: { fsPath: '/test/workspace', path: '/test/workspace' },
        name: 'workspace',
        index: 0,
      },
    ]);
    const provider = new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    ) as unknown as {
      _view?: { visible: boolean };
      _analyzer?: { invalidateWorkspaceFiles(filePaths: readonly string[]): string[] };
      markWorkspaceRefreshPending(logMessage: string, filePaths?: readonly string[]): void;
      flushPendingWorkspaceRefresh(): void;
    };
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const refreshChangedFiles = vi.fn(() => Promise.resolve());

    provider._view = { visible: true };
    (methodContainers.refresh as unknown as {
      refreshChangedFiles(filePaths: readonly string[]): Promise<void>;
    })
      .refreshChangedFiles = refreshChangedFiles;

    provider.markWorkspaceRefreshPending('[CodeGraphy] File saved, refreshing graph', [
      '/test/workspace/src/a.ts',
    ]);
    provider.markWorkspaceRefreshPending('[CodeGraphy] File created, refreshing graph', [
      '/test/workspace/src/b.ts',
    ]);
    provider.flushPendingWorkspaceRefresh();

    expect(refreshChangedFiles).toHaveBeenCalledWith([
      '/test/workspace/src/a.ts',
      '/test/workspace/src/b.ts',
    ]);
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File created, refreshing graph');

    consoleSpy.mockRestore();
  });

});
