import { vi } from 'vitest';

export function createContext(vscodeModule: typeof import('vscode')) {
  return {
    subscriptions: [],
    extensionUri: vscodeModule.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

export function createRestoredState() {
  return {
    depthMode: false,
    dagMode: null,
    nodeSizeMode: 'connections' as const,
  };
}

export async function loadSubject(
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

  vi.doMock('../../../../../src/extension/pipeline/service/lifecycleFacade', () => ({
    WorkspacePipeline: class WorkspacePipeline {
      warmGraphCache = vi.fn(async () => undefined);
    },
  }));
  vi.doMock('../../../../../src/core/views', () => ({
    ViewRegistry: class ViewRegistry {
      register = vi.fn();
      get = vi.fn(() => undefined);
      getDefaultViewId = vi.fn(() => 'codegraphy.graph');
    },
    coreViews: [],
  }));
  vi.doMock('../../../../../src/core/plugins/events/bus', () => ({
    EventBus: class EventBus {},
  }));
  vi.doMock('../../../../../src/core/plugins/decoration/manager', () => ({
    DecorationManager: class DecorationManager {},
  }));
  vi.doMock('../../../../../src/extension/graphView/provider/wiring/methodContainers', () => ({
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
  const { GraphViewProvider } = await import('../../../../../src/extension/graphViewProvider');

  return { GraphViewProvider, methodContainers, vscodeModule };
}

export function unmockRuntimeModules() {
  vi.doUnmock('vscode');
  vi.doUnmock('../../../../../src/extension/pipeline/service/lifecycleFacade');
  vi.doUnmock('../../../../../src/extension/repoSettings/meta');
  vi.doUnmock('../../../../../src/core/views');
  vi.doUnmock('../../../../../src/core/plugins/events/bus');
  vi.doUnmock('../../../../../src/core/plugins/decoration/manager');
  vi.doUnmock('../../../../../src/extension/graphView/provider/wiring/methodContainers');
  vi.doUnmock('../../../../../src/extension/graphView/provider/wiring/bootstrap');
}
