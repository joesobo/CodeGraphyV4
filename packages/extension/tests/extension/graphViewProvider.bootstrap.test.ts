import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as VSCode from 'vscode';
import { getGraphViewProviderInternals } from './graphViewProvider/internals';

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
  vi.doMock('../../src/extension/pipeline/service/lifecycleFacade', () => ({
    WorkspacePipeline: class WorkspacePipeline {
      warmGraphCache = vi.fn(async () => undefined);
    },
  }));
  vi.doMock('../../src/core/views', () => ({
    ViewRegistry: class ViewRegistry {
      register = vi.fn();
      get = vi.fn(() => undefined);
      getDefaultViewId = vi.fn(() => 'codegraphy.graph');
    },
    coreViews: [],
  }));
  vi.doMock('../../src/core/plugins/events/bus', () => ({
    EventBus: class EventBus {},
  }));
  vi.doMock('../../src/core/plugins/decoration/manager', () => ({
    DecorationManager: class DecorationManager {},
  }));
  vi.doMock('../../src/extension/graphView/provider/analysis/methods', () => ({
    createGraphViewProviderAnalysisMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/commands', () => ({
    createGraphViewProviderCommandMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/file/actions', () => ({
    createGraphViewProviderFileActionMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/file/info', () => ({
    createGraphViewProviderFileInfoMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/plugins', () => ({
    createGraphViewProviderPluginMethods: () => ({
      _sendDecorations: vi.fn(),
    }),
  }));
  vi.doMock('../../src/extension/graphView/provider/pluginResources', () => ({
    createGraphViewProviderPluginResourceMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/physicsSettings', () => ({
    createGraphViewProviderPhysicsSettingsMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/refresh', () => ({
    createGraphViewProviderRefreshMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/settingsState', () => ({
    createGraphViewProviderSettingsStateMethods: () => ({
      _loadDisabledRulesAndPlugins: vi.fn(() => false),
    }),
  }));
  vi.doMock('../../src/extension/graphView/provider/timeline/methods', () => ({
    createGraphViewProviderTimelineMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/view/context', () => ({
    createGraphViewProviderViewContextMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/view/selection', () => ({
    createGraphViewProviderViewSelectionMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/webview/host', () => ({
    createGraphViewProviderWebviewMethods: () => ({
      _sendMessage: vi.fn(),
    }),
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
  const { GraphViewProvider } = await import('../../src/extension/graphViewProvider');

  return { GraphViewProvider, vscodeModule };
}

describe('GraphViewProvider bootstrap wiring', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('vscode');
    vi.doUnmock('../../src/extension/pipeline/service/lifecycleFacade');
    vi.doUnmock('../../src/core/views');
    vi.doUnmock('../../src/core/plugins/events/bus');
    vi.doUnmock('../../src/core/plugins/decoration/manager');
    vi.doUnmock('../../src/extension/graphView/provider/analysis/methods');
    vi.doUnmock('../../src/extension/graphView/provider/commands');
    vi.doUnmock('../../src/extension/graphView/provider/file/actions');
    vi.doUnmock('../../src/extension/graphView/provider/file/info');
    vi.doUnmock('../../src/extension/graphView/provider/plugins');
    vi.doUnmock('../../src/extension/graphView/provider/pluginResources');
    vi.doUnmock('../../src/extension/graphView/provider/physicsSettings');
    vi.doUnmock('../../src/extension/graphView/provider/refresh');
    vi.doUnmock('../../src/extension/graphView/provider/settingsState');
    vi.doUnmock('../../src/extension/graphView/provider/timeline/methods');
    vi.doUnmock('../../src/extension/graphView/provider/view/context');
    vi.doUnmock('../../src/extension/graphView/provider/view/selection');
    vi.doUnmock('../../src/extension/graphView/provider/webview/host');
    vi.doUnmock('../../src/extension/graphView/provider/wiring/bootstrap');
    vi.resetModules();
  });

  it('passes an empty workspace root to provider services when no folder is open', async () => {
    const initializeGraphViewProviderServices = vi.fn();
    const restoreGraphViewProviderState = vi.fn(() => createRestoredState());

    vi.doMock('../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices,
      restoreGraphViewProviderState,
    }));

    const { GraphViewProvider, vscodeModule } = await loadSubject(undefined);

    new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    );

    expect(initializeGraphViewProviderServices).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceRoot: '',
      }),
    );
  });

  it('passes an empty workspace root to provider services when the folder list is empty', async () => {
    const initializeGraphViewProviderServices = vi.fn();
    const restoreGraphViewProviderState = vi.fn(() => createRestoredState());

    vi.doMock('../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices,
      restoreGraphViewProviderState,
    }));

    const { GraphViewProvider, vscodeModule } = await loadSubject([]);

    new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    );

    expect(initializeGraphViewProviderServices).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceRoot: '',
      }),
    );
  });
});
