import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as VSCode from 'vscode';
import type { PendingWorkspaceRefreshState } from '../../../../src/extension/graphView/provider/runtime/workspaceRefreshPersistence';

function createContext(vscodeModule: typeof import('vscode')) {
  return {
    subscriptions: [],
    extensionUri: vscodeModule.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

function createRestoredState() {
  return {
    depthMode: false,
    dagMode: null,
    nodeSizeMode: 'connections' as const,
  };
}

async function loadSubject(
  workspaceFolders:
    | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
    | undefined,
) {
  const methodContainers = {
    analysis: {},
    command: {
      undo: vi.fn(async () => 'undo'),
      redo: vi.fn(async () => 'redo'),
    },
    fileAction: {},
    fileInfo: {},
    physicsSettings: {},
    plugin: {
      _sendDecorations: vi.fn(),
    },
    pluginResource: {},
    refresh: {
      refresh: vi.fn(),
    },
    settingsState: {
      _loadDisabledRulesAndPlugins: vi.fn(() => false),
    },
    timeline: {},
    viewContext: {},
    viewSelection: {
      changeView: vi.fn(async () => undefined),
      setDepthLimit: vi.fn(async () => undefined),
    },
    webview: {
      _sendMessage: vi.fn(),
    },
  };

  vi.doMock('../../../../src/extension/pipeline/service/lifecycleFacade', () => ({
    WorkspacePipeline: class WorkspacePipeline {},
  }));
  vi.doMock('../../../../src/core/views', () => ({
    ViewRegistry: class ViewRegistry {
      register = vi.fn();
      get = vi.fn(() => undefined);
      getDefaultViewId = vi.fn(() => 'codegraphy.graph');
    },
    coreViews: [],
  }));
  vi.doMock('../../../../src/core/plugins/events/bus', () => ({
    EventBus: class EventBus {},
  }));
  vi.doMock('../../../../src/core/plugins/decoration/manager', () => ({
    DecorationManager: class DecorationManager {},
  }));
  vi.doMock('../../../../src/extension/graphView/provider/wiring/methodContainers', () => ({
    createGraphViewProviderMethodContainers: vi.fn(() => methodContainers),
  }));
  vi.doMock('vscode', async () => {
    const actual = await vi.importActual<typeof import('vscode')>('vscode');

    return {
      ...actual,
      workspace: {
        ...actual.workspace,
        workspaceFolders,
      },
    };
  });

  const vscodeModule = await import('vscode');
  const { GraphViewProvider } = await import('../../../../src/extension/graphViewProvider');

  return { GraphViewProvider, methodContainers, vscodeModule };
}

describe('graphView/provider/runtime', () => {

    beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();
    });



    afterEach(() => {
      vi.restoreAllMocks();
      vi.doUnmock('vscode');
      vi.doUnmock('../../../../src/extension/pipeline/service/lifecycleFacade');
      vi.doUnmock('../../../../src/extension/repoSettings/meta');
      vi.doUnmock('../../../../src/core/views');
      vi.doUnmock('../../../../src/core/plugins/events/bus');
      vi.doUnmock('../../../../src/core/plugins/decoration/manager');
      vi.doUnmock('../../../../src/extension/graphView/provider/wiring/methodContainers');
      vi.doUnmock('../../../../src/extension/graphView/provider/wiring/bootstrap');
      vi.resetModules();
    });



    it('tracks the installed plugin activation promise', async () => {
      vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
        initializeGraphViewProviderServices: vi.fn(),
        restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
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
      );
      const activationPromise = Promise.resolve();

      provider.setInstalledPluginActivationPromise(activationPromise);

      expect(
        (provider as unknown as { _installedPluginActivationPromise: Promise<void> })
          ._installedPluginActivationPromise,
      ).toBe(activationPromise);
    }, 10_000);



    it('returns no persisted workspace refresh when there is no workspace root', async () => {
      vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
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
      vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
        initializeGraphViewProviderServices: vi.fn(),
        restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
      }));
      vi.doMock('../../../../src/extension/repoSettings/meta', () => ({
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
      vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
        initializeGraphViewProviderServices: vi.fn(),
        restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
      }));
      vi.doMock('../../../../src/extension/repoSettings/meta', () => ({
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
      vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
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



    it('keeps queued workspace changes pending when only the timeline view is visible', async () => {
      vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
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
        _timelineView?: { visible: boolean };
        markWorkspaceRefreshPending(logMessage: string, filePaths?: readonly string[]): void;
        flushPendingWorkspaceRefresh(): void;
      };
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const refreshChangedFiles = vi.fn(() => Promise.resolve());

      provider._timelineView = { visible: true };
      (methodContainers.refresh as unknown as {
        refreshChangedFiles(filePaths: readonly string[]): Promise<void>;
      }).refreshChangedFiles = refreshChangedFiles;

      provider.markWorkspaceRefreshPending('[CodeGraphy] File saved, refreshing graph', [
        '/test/workspace/src/a.ts',
      ]);
      provider.flushPendingWorkspaceRefresh();

      expect(refreshChangedFiles).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
});
