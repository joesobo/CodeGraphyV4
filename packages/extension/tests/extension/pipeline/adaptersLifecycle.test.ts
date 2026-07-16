import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createContext,
  createPlugin,
  vscode,
  WorkspacePipeline,
  IPlugin,
  setUpAdapters,
  clearWorkspaceFolders,
} from './adaptersFixture';

describe('WorkspacePipeline lifecycle adapters', () => {
  beforeEach(setUpAdapters);

  it('initializes registered plugins with the current workspace root', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );
    const initializeAllSpy = vi.spyOn((analyzer as unknown as {
      _registry: { initializeAll: (workspaceRoot: string) => Promise<void> };
    })._registry, 'initializeAll').mockResolvedValue();

    await analyzer.initialize();

    expect(initializeAllSpy).toHaveBeenCalledWith('/test/workspace');
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] WorkspacePipeline initialized');
  });

  it('skips plugin initialization when no workspace root is available', async () => {
    clearWorkspaceFolders();
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );
    const initializeAllSpy = vi.spyOn((analyzer as unknown as {
      _registry: { initializeAll: (workspaceRoot: string) => Promise<void> };
    })._registry, 'initializeAll').mockResolvedValue();

    await analyzer.initialize();

    expect(initializeAllSpy).not.toHaveBeenCalled();
  });

  it('uses registry file lookup when calculating plugin statuses', () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );
    const analyzerPrivate = analyzer as unknown as {
      _lastDiscoveredFiles: Array<{ relativePath: string }>;
      _lastFileConnections: Map<string, Array<{ resolvedPath: string; specifier: string; type: 'static' }>>;
      _lastWorkspaceRoot: string;
      _registry: {
        getPluginForFile: (filePath: string) => IPlugin | undefined;
        list: () => Array<{ builtIn: boolean; plugin: IPlugin }>;
      };
    };
    const typescriptPlugin = createPlugin('plugin.typescript', 'TypeScript', ['.ts']);

    analyzerPrivate._lastDiscoveredFiles = [{ relativePath: 'src/index.ts' }];
    analyzerPrivate._lastFileConnections = new Map([
      ['src/index.ts', [{ specifier: './utils', resolvedPath: '/test/workspace/src/utils.ts', type: 'static' , sourceId: 'test-source', kind: 'import', pluginId: 'plugin.typescript' }]],
    ]);
    analyzerPrivate._lastWorkspaceRoot = '/test/workspace';
    vi.spyOn(analyzerPrivate._registry, 'list').mockReturnValue([
      { plugin: typescriptPlugin, builtIn: false },
    ]);
    vi.spyOn(analyzerPrivate._registry, 'getPluginForFile').mockReturnValue(typescriptPlugin);

    const statuses = analyzer.getPluginStatuses(new Set());

    expect(statuses).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'plugin.typescript',
        connectionCount: 1,
        status: 'active',
      }),
    ]));
  });
});
