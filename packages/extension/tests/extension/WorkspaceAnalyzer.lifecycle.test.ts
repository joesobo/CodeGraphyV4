import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  WORKSPACE_ANALYSIS_CACHE_KEY,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
} from '../../src/extension/workspaceAnalysisCache';
import { WorkspaceAnalyzer } from '../../src/extension/WorkspaceAnalyzer';

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

describe('WorkspaceAnalyzer lifecycle', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
  });

  it('clears the cache and persists the empty state', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const context = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    };
    const analyzer = new WorkspaceAnalyzer(
      context as unknown as vscode.ExtensionContext
    );
    const analyzerPrivate = analyzer as unknown as {
      _cache: {
        version: string;
        files: Record<string, unknown>;
      };
    };

    analyzerPrivate._cache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/index.ts': {
          mtime: 10,
          connections: [],
        },
      },
    };

    analyzer.clearCache();

    expect(analyzerPrivate._cache).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {},
    });
    expect(context.workspaceState.update).toHaveBeenCalledWith(
      WORKSPACE_ANALYSIS_CACHE_KEY,
      analyzerPrivate._cache
    );
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] Cache cleared');
  });

  it('disposes every registered plugin through the registry', () => {
    const analyzer = new WorkspaceAnalyzer({
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);
    const disposeAllSpy = vi.spyOn((analyzer as unknown as {
      _registry: { disposeAll: () => void };
    })._registry, 'disposeAll');

    analyzer.dispose();

    expect(disposeAllSpy).toHaveBeenCalledTimes(1);
  });

  it('returns undefined for plugin names when no workspace root exists', () => {
    workspaceFoldersValue = undefined;
    const analyzer = new WorkspaceAnalyzer({
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);
    const getPluginForFileSpy = vi.spyOn((analyzer as unknown as {
      _registry: { getPluginForFile: (filePath: string) => unknown };
    })._registry, 'getPluginForFile');

    expect(analyzer.getPluginNameForFile('src/index.ts')).toBeUndefined();
    expect(getPluginForFileSpy).not.toHaveBeenCalled();
  });

  it('returns undefined for plugin names when no plugin matches the file', () => {
    const analyzer = new WorkspaceAnalyzer({
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);
    const analyzerPrivate = analyzer as unknown as {
      _lastWorkspaceRoot: string;
      _registry: { getPluginForFile: (filePath: string) => unknown };
    };

    analyzerPrivate._lastWorkspaceRoot = '/test/workspace';
    vi.spyOn(analyzerPrivate._registry, 'getPluginForFile').mockReturnValue(undefined);

    expect(analyzer.getPluginNameForFile('src/index.ts')).toBeUndefined();
  });

  it('returns file stat details when the workspace file system succeeds', async () => {
    const analyzer = new WorkspaceAnalyzer({
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);
    vi.spyOn(vscode.workspace.fs, 'stat').mockResolvedValue({
      mtime: 17,
      size: 64,
    } as never);

    const result = await (analyzer as unknown as {
      _getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>;
    })._getFileStat('/test/workspace/src/index.ts');

    expect(result).toEqual({ mtime: 17, size: 64 });
  });

  it('returns null when workspace file stat lookup fails', async () => {
    const analyzer = new WorkspaceAnalyzer({
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);
    vi.spyOn(vscode.workspace.fs, 'stat').mockRejectedValue(new Error('missing'));

    const result = await (analyzer as unknown as {
      _getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>;
    })._getFileStat('/test/workspace/src/index.ts');

    expect(result).toBeNull();
  });

  it('returns undefined from _getWorkspaceRoot when no workspace folders exist', () => {
    workspaceFoldersValue = undefined;
    const analyzer = new WorkspaceAnalyzer({
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);

    expect((analyzer as unknown as {
      _getWorkspaceRoot: () => string | undefined;
    })._getWorkspaceRoot()).toBeUndefined();
  });
});
