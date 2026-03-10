/**
 * Tests for WorkspaceAnalyzer rule-based filtering and plugin toggling.
 * Verifies rebuildGraph(), getPluginStatuses(), and _buildGraphData filtering.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { WorkspaceAnalyzer } from '../../src/extension/WorkspaceAnalyzer';

// Set up workspace folders before tests
Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => [{ uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 }],
  configurable: true,
});

// Mock vscode.workspace.fs.stat to return file stats
(vscode.workspace.fs as Record<string, unknown>).stat = vi.fn().mockResolvedValue({
  mtime: Date.now(),
  size: 100,
});

describe('WorkspaceAnalyzer rules', () => {
  let analyzer: WorkspaceAnalyzer;
  let mockContext: {
    subscriptions: { dispose: () => void }[];
    extensionUri: { fsPath: string; path: string };
    workspaceState: {
      get: <T>(_key: string) => T | undefined;
      update: (_key: string, _value: unknown) => Thenable<void>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    };

    analyzer = new WorkspaceAnalyzer(
      mockContext as unknown as vscode.ExtensionContext
    );
  });

  describe('rebuildGraph', () => {
    it('returns empty graph when no prior analysis', () => {
      const result = analyzer.rebuildGraph(new Set(), new Set(), true);
      expect(result).toEqual({ nodes: [], edges: [] });
    });
  });

  describe('getPluginStatuses', () => {
    it('returns statuses for all registered plugins after initialize', async () => {
      await analyzer.initialize();

      const statuses = analyzer.getPluginStatuses(new Set(), new Set());

      // Should have 5 built-in plugins
      expect(statuses.length).toBe(5);

      // Verify plugin names are present (sorted alphabetically)
      const names = statuses.map(s => s.name);
      expect(names).toContain('TypeScript/JavaScript');
      expect(names).toContain('GDScript (Godot)');
      expect(names).toContain('Python');
      expect(names).toContain('C#');
      expect(names).toContain('Markdown');
    });

    it('marks all plugins as enabled when no disabled set', async () => {
      await analyzer.initialize();
      const statuses = analyzer.getPluginStatuses(new Set(), new Set());

      for (const status of statuses) {
        expect(status.enabled).toBe(true);
      }
    });

    it('marks a plugin as disabled when in disabled set', async () => {
      await analyzer.initialize();
      const disabledPlugins = new Set(['codegraphy.typescript']);
      const statuses = analyzer.getPluginStatuses(new Set(), disabledPlugins);

      const tsStatus = statuses.find(s => s.id === 'codegraphy.typescript');
      expect(tsStatus).toBeDefined();
      expect(tsStatus!.enabled).toBe(false);

      // Other plugins should still be enabled
      const pyStatus = statuses.find(s => s.id === 'codegraphy.python');
      expect(pyStatus).toBeDefined();
      expect(pyStatus!.enabled).toBe(true);
    });

    it('includes rule statuses for each plugin', async () => {
      await analyzer.initialize();
      const statuses = analyzer.getPluginStatuses(new Set(), new Set());

      const tsStatus = statuses.find(s => s.id === 'codegraphy.typescript');
      expect(tsStatus).toBeDefined();
      expect(tsStatus!.rules.length).toBe(4);

      const ruleIds = tsStatus!.rules.map(r => r.id);
      expect(ruleIds).toContain('es6-import');
      expect(ruleIds).toContain('reexport');
      expect(ruleIds).toContain('dynamic-import');
      expect(ruleIds).toContain('commonjs-require');
    });

    it('marks rules as disabled via qualified IDs', async () => {
      await analyzer.initialize();
      const disabledRules = new Set(['codegraphy.typescript:dynamic-import']);
      const statuses = analyzer.getPluginStatuses(disabledRules, new Set());

      const tsStatus = statuses.find(s => s.id === 'codegraphy.typescript');
      const dynamicRule = tsStatus!.rules.find(r => r.id === 'dynamic-import');
      expect(dynamicRule).toBeDefined();
      expect(dynamicRule!.enabled).toBe(false);

      // Other rules should still be enabled
      const es6Rule = tsStatus!.rules.find(r => r.id === 'es6-import');
      expect(es6Rule).toBeDefined();
      expect(es6Rule!.enabled).toBe(true);
    });

    it('rule statuses include qualifiedId in the format pluginId:ruleId', async () => {
      await analyzer.initialize();
      const statuses = analyzer.getPluginStatuses(new Set(), new Set());

      const tsStatus = statuses.find(s => s.id === 'codegraphy.typescript');
      for (const rule of tsStatus!.rules) {
        expect(rule.qualifiedId).toBe(`codegraphy.typescript:${rule.id}`);
      }
    });

    it('all plugins report inactive status when no files discovered', async () => {
      await analyzer.initialize();
      const statuses = analyzer.getPluginStatuses(new Set(), new Set());

      // No files have been discovered/analyzed so all should be inactive
      for (const status of statuses) {
        expect(status.status).toBe('inactive');
        expect(status.connectionCount).toBe(0);
      }
    });
  });

  describe('_buildGraphData filtering via rebuildGraph', () => {
    /**
     * We test _buildGraphData indirectly via rebuildGraph by manually
     * populating the analyzer's internal state.
     */

    it('filters out connections from disabled rules', async () => {
      await analyzer.initialize();

      // Manually populate internal state to simulate a prior analysis.
      // We use the internal fields directly to set up the scenario.
      const fileConnections = new Map<string, { specifier: string; resolvedPath: string | null; type: 'static' | 'dynamic' | 'require' | 'reexport'; ruleId?: string }[]>();

      fileConnections.set('src/index.ts', [
        { specifier: './utils', resolvedPath: '/test/workspace/src/utils.ts', type: 'static', ruleId: 'es6-import' },
        { specifier: './lazy', resolvedPath: '/test/workspace/src/lazy.ts', type: 'dynamic', ruleId: 'dynamic-import' },
      ]);
      fileConnections.set('src/utils.ts', []);
      fileConnections.set('src/lazy.ts', []);

      // Set internal state via property access (testing the private field indirectly)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const analyzerAny = analyzer as any;
      analyzerAny._lastFileConnections = fileConnections;
      analyzerAny._lastWorkspaceRoot = '/test/workspace';
      analyzerAny._lastDiscoveredFiles = [
        { absolutePath: '/test/workspace/src/index.ts', relativePath: 'src/index.ts' },
        { absolutePath: '/test/workspace/src/utils.ts', relativePath: 'src/utils.ts' },
        { absolutePath: '/test/workspace/src/lazy.ts', relativePath: 'src/lazy.ts' },
      ];

      // No disabled rules: should have 2 edges
      const fullResult = analyzer.rebuildGraph(new Set(), new Set(), true);
      expect(fullResult.edges.length).toBe(2);

      // Disable dynamic-import rule: should filter out the dynamic import edge
      const disabledRules = new Set(['codegraphy.typescript:dynamic-import']);
      const filteredResult = analyzer.rebuildGraph(disabledRules, new Set(), true);
      expect(filteredResult.edges.length).toBe(1);
      expect(filteredResult.edges[0].from).toBe('src/index.ts');
      expect(filteredResult.edges[0].to).toBe('src/utils.ts');
    });

    it('filters out all connections from disabled plugins', async () => {
      await analyzer.initialize();

      const fileConnections = new Map<string, { specifier: string; resolvedPath: string | null; type: 'static' | 'dynamic' | 'require' | 'reexport'; ruleId?: string }[]>();

      fileConnections.set('src/index.ts', [
        { specifier: './utils', resolvedPath: '/test/workspace/src/utils.ts', type: 'static', ruleId: 'es6-import' },
      ]);
      fileConnections.set('src/utils.ts', []);
      fileConnections.set('main.py', [
        { specifier: 'config', resolvedPath: '/test/workspace/config.py', type: 'static', ruleId: 'standard-import' },
      ]);
      fileConnections.set('config.py', []);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const analyzerAny = analyzer as any;
      analyzerAny._lastFileConnections = fileConnections;
      analyzerAny._lastWorkspaceRoot = '/test/workspace';
      analyzerAny._lastDiscoveredFiles = [
        { absolutePath: '/test/workspace/src/index.ts', relativePath: 'src/index.ts' },
        { absolutePath: '/test/workspace/src/utils.ts', relativePath: 'src/utils.ts' },
        { absolutePath: '/test/workspace/main.py', relativePath: 'main.py' },
        { absolutePath: '/test/workspace/config.py', relativePath: 'config.py' },
      ];

      // No disabled plugins: should have edges from both TS and Python
      const fullResult = analyzer.rebuildGraph(new Set(), new Set(), true);
      expect(fullResult.edges.length).toBe(2);

      // Disable TypeScript plugin: only Python edges remain
      const disabledPlugins = new Set(['codegraphy.typescript']);
      const filteredResult = analyzer.rebuildGraph(new Set(), disabledPlugins, true);
      expect(filteredResult.edges.length).toBe(1);
      expect(filteredResult.edges[0].from).toBe('main.py');
      expect(filteredResult.edges[0].to).toBe('config.py');
    });

    it('respects both disabled rules and disabled plugins simultaneously', async () => {
      await analyzer.initialize();

      const fileConnections = new Map<string, { specifier: string; resolvedPath: string | null; type: 'static' | 'dynamic' | 'require' | 'reexport'; ruleId?: string }[]>();

      fileConnections.set('src/index.ts', [
        { specifier: './a', resolvedPath: '/test/workspace/src/a.ts', type: 'static', ruleId: 'es6-import' },
        { specifier: './b', resolvedPath: '/test/workspace/src/b.ts', type: 'dynamic', ruleId: 'dynamic-import' },
      ]);
      fileConnections.set('src/a.ts', []);
      fileConnections.set('src/b.ts', []);
      fileConnections.set('main.py', [
        { specifier: 'config', resolvedPath: '/test/workspace/config.py', type: 'static', ruleId: 'standard-import' },
      ]);
      fileConnections.set('config.py', []);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const analyzerAny = analyzer as any;
      analyzerAny._lastFileConnections = fileConnections;
      analyzerAny._lastWorkspaceRoot = '/test/workspace';
      analyzerAny._lastDiscoveredFiles = [
        { absolutePath: '/test/workspace/src/index.ts', relativePath: 'src/index.ts' },
        { absolutePath: '/test/workspace/src/a.ts', relativePath: 'src/a.ts' },
        { absolutePath: '/test/workspace/src/b.ts', relativePath: 'src/b.ts' },
        { absolutePath: '/test/workspace/main.py', relativePath: 'main.py' },
        { absolutePath: '/test/workspace/config.py', relativePath: 'config.py' },
      ];

      // Disable Python plugin AND TypeScript dynamic-import rule
      const disabledRules = new Set(['codegraphy.typescript:dynamic-import']);
      const disabledPlugins = new Set(['codegraphy.python']);
      const result = analyzer.rebuildGraph(disabledRules, disabledPlugins, true);

      // Only the es6-import edge from TS should remain
      expect(result.edges.length).toBe(1);
      expect(result.edges[0].from).toBe('src/index.ts');
      expect(result.edges[0].to).toBe('src/a.ts');
    });

    it('orphan nodes are hidden when showOrphans is false', async () => {
      await analyzer.initialize();

      const fileConnections = new Map<string, { specifier: string; resolvedPath: string | null; type: 'static' | 'dynamic' | 'require' | 'reexport'; ruleId?: string }[]>();

      fileConnections.set('src/index.ts', [
        { specifier: './utils', resolvedPath: '/test/workspace/src/utils.ts', type: 'static', ruleId: 'es6-import' },
      ]);
      fileConnections.set('src/utils.ts', []);
      fileConnections.set('src/orphan.ts', []);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const analyzerAny = analyzer as any;
      analyzerAny._lastFileConnections = fileConnections;
      analyzerAny._lastWorkspaceRoot = '/test/workspace';
      analyzerAny._lastDiscoveredFiles = [
        { absolutePath: '/test/workspace/src/index.ts', relativePath: 'src/index.ts' },
        { absolutePath: '/test/workspace/src/utils.ts', relativePath: 'src/utils.ts' },
        { absolutePath: '/test/workspace/src/orphan.ts', relativePath: 'src/orphan.ts' },
      ];

      // showOrphans=true: all 3 nodes
      const withOrphans = analyzer.rebuildGraph(new Set(), new Set(), true);
      expect(withOrphans.nodes.length).toBe(3);

      // showOrphans=false: only connected nodes
      const withoutOrphans = analyzer.rebuildGraph(new Set(), new Set(), false);
      expect(withoutOrphans.nodes.length).toBe(2);
      const nodeIds = withoutOrphans.nodes.map(n => n.id);
      expect(nodeIds).toContain('src/index.ts');
      expect(nodeIds).toContain('src/utils.ts');
      expect(nodeIds).not.toContain('src/orphan.ts');
    });
  });

  describe('v2 pre-analyze payload', () => {
    it('passes full file content to notifyPreAnalyze', async () => {
      const analyzerPriv = analyzer as unknown as {
        _discovery: {
          readContent: (file: { relativePath: string }) => Promise<string>;
        };
        _registry: {
          list: () => unknown[];
          notifyPreAnalyze: (files: unknown[], workspaceRoot: string) => Promise<void>;
        };
        _preAnalyzePlugins: (
          files: Array<{ absolutePath: string; relativePath: string }>,
          workspaceRoot: string,
        ) => Promise<void>;
      };
      const files = [
        { absolutePath: '/test/workspace/src/a.ts', relativePath: 'src/a.ts' },
        { absolutePath: '/test/workspace/src/b.py', relativePath: 'src/b.py' },
      ];

      analyzerPriv._discovery = {
        readContent: vi.fn(async (file: { relativePath: string }) => {
          if (file.relativePath === 'src/a.ts') return "import './b'";
          return 'print("b")';
        }),
      };

      const notifyPreAnalyze = vi.fn(async () => {});
      analyzerPriv._registry = {
        list: vi.fn(() => []),
        notifyPreAnalyze,
      };

      await analyzerPriv._preAnalyzePlugins(files, '/test/workspace');

      expect(notifyPreAnalyze).toHaveBeenCalledTimes(1);
      const [payload, workspaceRoot] = notifyPreAnalyze.mock.calls[0];
      expect(workspaceRoot).toBe('/test/workspace');
      expect(payload).toEqual([
        {
          absolutePath: '/test/workspace/src/a.ts',
          relativePath: 'src/a.ts',
          content: "import './b'",
        },
        {
          absolutePath: '/test/workspace/src/b.py',
          relativePath: 'src/b.py',
          content: 'print("b")',
        },
      ]);
    });
  });
});
