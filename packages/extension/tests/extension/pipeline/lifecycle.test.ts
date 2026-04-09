import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  WORKSPACE_ANALYSIS_CACHE_KEY,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
} from '../../../src/extension/pipeline/cache';
import {
  loadWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCache,
} from '../../../src/extension/pipeline/database/cache';
import * as repoMetaModule from '../../../src/extension/repoSettings/meta';
import { WorkspacePipeline } from '../../../src/extension/pipeline/service';

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;
const tempWorkspaceRoots = new Set<string>();

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

describe('WorkspacePipeline lifecycle', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const workspaceRoot of tempWorkspaceRoots) {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
    tempWorkspaceRoots.clear();
  });

  function createWorkspaceRoot(): string {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-pipeline-lifecycle-'));
    tempWorkspaceRoots.add(workspaceRoot);
    return workspaceRoot;
  }

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
    const analyzer = new WorkspacePipeline(
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
          analysis: {
            filePath: '/workspace/src/index.ts',
            relations: [],
          },
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
    const analyzer = new WorkspacePipeline({
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
    const analyzer = new WorkspacePipeline({
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
    const analyzer = new WorkspacePipeline({
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

  it('returns the plugin name using the cached workspace root', () => {
    const analyzer = new WorkspacePipeline({
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
    const getPluginForFileSpy = vi
      .spyOn(analyzerPrivate._registry, 'getPluginForFile')
      .mockReturnValue({ name: 'TypeScript' });

    expect(analyzer.getPluginNameForFile('src/index.ts')).toBe('TypeScript');
    expect(getPluginForFileSpy).toHaveBeenCalledWith('/test/workspace/src/index.ts');
  });

  it('returns the plugin name using the current workspace root when no cached root exists', () => {
    const analyzer = new WorkspacePipeline({
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

    analyzerPrivate._lastWorkspaceRoot = '';
    const getPluginForFileSpy = vi
      .spyOn(analyzerPrivate._registry, 'getPluginForFile')
      .mockReturnValue({ name: 'TypeScript' });

    expect(analyzer.getPluginNameForFile('src/index.ts')).toBe('TypeScript');
    expect(getPluginForFileSpy).toHaveBeenCalledWith('/test/workspace/src/index.ts');
  });

  it('returns file stat details when the workspace file system succeeds', async () => {
    const analyzer = new WorkspacePipeline({
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
    const analyzer = new WorkspacePipeline({
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
    const analyzer = new WorkspacePipeline({
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

  it('loads the repo-local persisted cache when .codegraphy/graph.lbug already exists', () => {
    const workspaceRoot = createWorkspaceRoot();
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceRoot), name: 'workspace', index: 0 },
    ];
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/index.ts': {
          mtime: 42,
          size: 10,
          analysis: {
            filePath: '/workspace/src/index.ts',
            relations: [],
          },
        },
      },
    });

    const analyzer = new WorkspacePipeline({
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);

    expect((analyzer as unknown as {
      _cache: {
        version: string;
        files: Record<string, unknown>;
      };
    })._cache).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/index.ts': {
          mtime: 42,
          size: 10,
          analysis: {
            filePath: '/workspace/src/index.ts',
            relations: [],
          },
        },
      },
    });
  });

  it('reports whether the repo already has an indexed graph', () => {
    const analyzer = new WorkspacePipeline({
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);

    vi.spyOn(repoMetaModule, 'readCodeGraphyRepoMeta').mockReturnValue({
      version: 1,
      lastIndexedAt: '2026-04-08T00:00:00.000Z',
      lastIndexedCommit: null,
      pluginSignature: 'plugin-signature',
      settingsSignature: 'settings-signature',
    });
    vi.spyOn(
      analyzer as unknown as {
        _getPluginSignature(): string | null;
      },
      '_getPluginSignature',
    ).mockReturnValue('plugin-signature');
    vi.spyOn(
      analyzer as unknown as {
        _getSettingsSignature(): string;
      },
      '_getSettingsSignature',
    ).mockReturnValue('settings-signature');
    expect(analyzer.hasIndex()).toBe(true);

    vi.spyOn(repoMetaModule, 'readCodeGraphyRepoMeta').mockReturnValue({
      version: 1,
      lastIndexedAt: null,
      lastIndexedCommit: null,
      pluginSignature: null,
      settingsSignature: null,
    });
    expect(analyzer.hasIndex()).toBe(false);
  });

  it('clears the repo-local database cache alongside the legacy workspace mirror', () => {
    const workspaceRoot = createWorkspaceRoot();
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceRoot), name: 'workspace', index: 0 },
    ];
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/index.ts': {
          mtime: 10,
          analysis: {
            filePath: '/workspace/src/index.ts',
            relations: [],
          },
        },
      },
    });

    const analyzer = new WorkspacePipeline({
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);

    analyzer.clearCache();

    expect(fs.existsSync(path.join(workspaceRoot, '.codegraphy', 'graph.lbug'))).toBe(true);
    expect(
      (analyzer as unknown as {
        _cache: {
          version: string;
          files: Record<string, unknown>;
        };
      })._cache,
    ).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {},
    });
    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {},
    });
  });

  it('treats an index as stale when plugin or settings signatures no longer match', () => {
    const analyzer = new WorkspacePipeline({
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);

    vi.spyOn(repoMetaModule, 'readCodeGraphyRepoMeta').mockReturnValue({
      version: 1,
      lastIndexedAt: '2026-04-08T00:00:00.000Z',
      lastIndexedCommit: null,
      pluginSignature: 'old-plugin-signature',
      settingsSignature: 'settings-signature',
    });
    vi.spyOn(
      analyzer as unknown as {
        _getPluginSignature(): string | null;
      },
      '_getPluginSignature',
    ).mockReturnValue('new-plugin-signature');
    vi.spyOn(
      analyzer as unknown as {
        _getSettingsSignature(): string;
      },
      '_getSettingsSignature',
    ).mockReturnValue('settings-signature');

    expect(analyzer.hasIndex()).toBe(false);
  });

  it('invalidates selected workspace files from the cache and persists the updated cache', () => {
    const workspaceRoot = createWorkspaceRoot();
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceRoot), name: 'workspace', index: 0 },
    ];
    const context = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    };
    const analyzer = new WorkspacePipeline(context as unknown as vscode.ExtensionContext);
    const analyzerPrivate = analyzer as unknown as {
      _cache: {
        version: string;
        files: Record<string, unknown>;
      };
      _lastFileAnalysis: Map<string, unknown>;
      _lastFileConnections: Map<string, unknown>;
    };

    analyzerPrivate._cache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/keep.ts': {
          mtime: 10,
          analysis: { filePath: '/workspace/src/keep.ts', relations: [] },
        },
        'src/remove.ts': {
          mtime: 11,
          analysis: { filePath: '/workspace/src/remove.ts', relations: [] },
        },
      },
    };
    analyzerPrivate._lastFileAnalysis = new Map([
      ['src/keep.ts', { filePath: '/workspace/src/keep.ts', relations: [] }],
      ['src/remove.ts', { filePath: '/workspace/src/remove.ts', relations: [] }],
    ]);
    analyzerPrivate._lastFileConnections = new Map([
      ['src/keep.ts', []],
      ['src/remove.ts', []],
    ]);

    expect(
      analyzer.invalidateWorkspaceFiles([
        path.join(workspaceRoot, 'src/remove.ts'),
        path.join(workspaceRoot, '..', 'other.ts'),
      ]),
    ).toEqual(['src/remove.ts']);
    expect(analyzerPrivate._cache.files).toEqual({
      'src/keep.ts': {
        mtime: 10,
        analysis: { filePath: '/workspace/src/keep.ts', relations: [] },
      },
    });
    expect(analyzerPrivate._lastFileAnalysis.has('src/remove.ts')).toBe(false);
    expect(analyzerPrivate._lastFileConnections.has('src/remove.ts')).toBe(false);
    expect(context.workspaceState.update).toHaveBeenCalledWith(
      WORKSPACE_ANALYSIS_CACHE_KEY,
      analyzerPrivate._cache,
    );
    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot).files['src/keep.ts']).toEqual({
      mtime: 10,
      size: 0,
      analysis: { filePath: '/workspace/src/keep.ts', relations: [] },
    });
  });
});
