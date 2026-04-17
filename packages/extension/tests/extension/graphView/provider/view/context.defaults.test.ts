import * as vscode from 'vscode';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('graphView/provider/view/context defaults', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.doUnmock('../../../../../src/extension/graphView/view/context');
    vi.doUnmock('../../../../../src/extension/graphView/view/broadcast');
    vi.doUnmock('../../../../../src/extension/graphView/presentation/transform');
    vi.doUnmock('../../../../../src/extension/graphView/provider/view/context');
    vi.doUnmock('../../../../../src/extension/graphView/settings/reader');
    vi.doUnmock('../../../../../src/extension/repoSettings/current');
  });

  it('uses repo settings for the codegraphy section and vscode settings for other sections', async () => {
    const codegraphyConfig = {
      get: vi.fn((_: string, fallback: unknown) => fallback),
      update: vi.fn(() => Promise.resolve()),
    };
    const otherConfig = {
      get: vi.fn((_: string, fallback: unknown) => fallback),
      update: vi.fn(() => Promise.resolve()),
    };
    const buildViewContext = vi.fn((options: {
      readSavedDepthLimit(): number;
      asRelativePath(uri: vscode.Uri): string;
    }) => {
      expect(options.readSavedDepthLimit()).toBe(1);
      expect(options.asRelativePath(vscode.Uri.file('/workspace/src/app.ts'))).toBe('src/app.ts');
      return { activePlugins: new Set(), depthLimit: 1 };
    });

    vi.doMock('../../../../../src/extension/repoSettings/current', () => ({
      getCodeGraphyConfiguration: vi.fn(() => codegraphyConfig),
    }));
    vi.doMock('../../../../../src/extension/graphView/view/context', () => ({
      buildGraphViewContext: buildViewContext,
    }));
    vi.doMock('../../../../../src/extension/graphView/presentation/transform', () => ({
      applyGraphViewTransform: vi.fn((_, __, rawGraphData) => ({ graphData: rawGraphData })),
    }));
    vi.doMock('../../../../../src/extension/graphView/view/broadcast', () => ({
      sendGraphViewDepthState: vi.fn(),
    }));

    const getConfiguration = vi.spyOn(vscode.workspace, 'getConfiguration')
      .mockImplementation((section?: string) => {
        if (section === 'workbench') {
          return otherConfig as never;
        }
        return {
          get: vi.fn((_: string, fallback: unknown) => fallback),
          update: vi.fn(() => Promise.resolve()),
        } as never;
      });

    const { createGraphViewProviderViewContextMethods } = await import(
      '../../../../../src/extension/graphView/provider/view/context'
    );

    const originalWorkspaceFolders = (vscode.workspace as { workspaceFolders?: unknown }).workspaceFolders;
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      configurable: true,
      value: [{ uri: vscode.Uri.file('/workspace') }],
    });
    const originalActiveTextEditor = (vscode.window as { activeTextEditor?: unknown }).activeTextEditor;
    Object.defineProperty(vscode.window, 'activeTextEditor', {
      configurable: true,
      value: { document: { uri: vscode.Uri.file('/workspace/src/app.ts') } },
    });
    const originalAsRelativePath = (vscode.workspace as { asRelativePath?: unknown }).asRelativePath;
    Object.defineProperty(vscode.workspace, 'asRelativePath', {
      configurable: true,
      value: vi.fn(() => 'src/app.ts'),
    });

    const source = {
      _context: { workspaceState: { get: vi.fn(), update: vi.fn() } },
      _analyzer: undefined,
      _viewRegistry: { get: vi.fn(), isViewAvailable: vi.fn(() => true) },
      _viewContext: { activePlugins: new Set<string>(), depthLimit: 1 },
      _depthMode: false,
      _rawGraphData: { nodes: [], edges: [] },
      _graphData: { nodes: [], edges: [] },
      _sendMessage: vi.fn(),
    };

    const methods = createGraphViewProviderViewContextMethods(source as never);
    methods._updateViewContext();

    expect(buildViewContext).toHaveBeenCalledOnce();
    expect(codegraphyConfig.get).toHaveBeenCalledWith('depthLimit', 1);
    expect(getConfiguration).not.toHaveBeenCalledWith('codegraphy');

    if (originalWorkspaceFolders === undefined) {
      delete (vscode.workspace as { workspaceFolders?: unknown }).workspaceFolders;
    } else {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        configurable: true,
        value: originalWorkspaceFolders,
      });
    }
    if (originalActiveTextEditor === undefined) {
      delete (vscode.window as { activeTextEditor?: unknown }).activeTextEditor;
    } else {
      Object.defineProperty(vscode.window, 'activeTextEditor', {
        configurable: true,
        value: originalActiveTextEditor,
      });
    }
    if (originalAsRelativePath === undefined) {
      delete (vscode.workspace as { asRelativePath?: unknown }).asRelativePath;
    } else {
      Object.defineProperty(vscode.workspace, 'asRelativePath', {
        configurable: true,
        value: originalAsRelativePath,
      });
    }
  });
});
