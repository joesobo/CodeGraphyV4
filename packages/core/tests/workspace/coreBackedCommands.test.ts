import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { collectDiagnosticEvents } from '../../src/diagnostics/events';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { requestWorkspaceGraphQuery } from '../../src/workspace/requestQuery';
import { readCodeGraphyWorkspaceStatusForCli } from '../../src/workspace/requestStatus';
import {
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyWorkspaceSettings,
} from '../../src/workspace/settings';
import { loadWorkspaceAnalysisDatabaseCache } from '../../src/graphCache/database/storage';
import { readAnalysisCacheTiers } from '../../src/analysis/fileAnalysis';
import { runCli } from '../../src/cli/run';

describe('core-backed CodeGraphy Workspace commands', () => {
  it('indexes, reports fresh status, and queries a workspace without VS Code', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-cli-workspace-'));
    await fs.writeFile(path.join(workspaceRoot, 'Home.md'), 'See [[Target.md]].\n', 'utf-8');
    await fs.writeFile(path.join(workspaceRoot, 'Target.md'), 'Done.\n', 'utf-8');

    const indexResult = await requestCodeGraphyIndexWorkspace({
      workspacePath: workspaceRoot,
    });
    const status = readCodeGraphyWorkspaceStatusForCli({
      workspacePath: workspaceRoot,
    });
    const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      edgeVisibility: { reference: true },
    });
    const queryResult = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'edges',
      arguments: { from: 'Home.md' },
    });

    expect(indexResult).toMatchObject({
      workspaceRoot,
      graphCache: '.codegraphy/graph.sqlite',
      indexing: {
        mode: 'full',
        analyzedFiles: 2,
        deletedFiles: 0,
        reusedFiles: 0,
      },
    });
    expect(status).toMatchObject({
      workspaceRoot,
      state: 'fresh',
      enabledPlugins: ['codegraphy.markdown'],
    });
    expect(queryResult.edges).toEqual([
      expect.objectContaining({
        from: 'Home.md',
        to: 'Target.md',
      }),
    ]);
  });

  it('reports a fresh cache immediately after indexing with an unavailable configured plugin', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-cli-missing-plugin-'));
    await fs.writeFile(path.join(workspaceRoot, 'Home.md'), '# Home\n', 'utf-8');
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [
        { id: 'codegraphy.markdown', enabled: true },
        { id: '@example/codegraphy-plugin', enabled: true },
      ],
    });

    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    expect(readCodeGraphyWorkspaceStatusForCli({ workspacePath: workspaceRoot })).toMatchObject({
      state: 'fresh',
      staleReasons: [],
    });
  });

  it('returns indexed Tree-sitter relationships through repo-relative query paths', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-cli-relationships-'));
    await fs.writeFile(
      path.join(workspaceRoot, 'entry.ts'),
      "import { target } from './target';\ntarget();\n",
      'utf-8',
    );
    await fs.writeFile(
      path.join(workspaceRoot, 'target.ts'),
      'export function target(): void {}\n',
      'utf-8',
    );
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    const queryResult = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'relationships',
      arguments: { from: 'entry.ts' },
    });

    expect(queryResult.relationships).toEqual([
      expect.objectContaining({
        from: 'entry.ts',
        to: 'target.ts',
        relationships: expect.arrayContaining([
          expect.objectContaining({ edgeType: 'import' }),
        ]),
      }),
    ]);
  });

  it('applies saved scope and filters while returning symbol nodes with metadata', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-cli-saved-scope-'));
    await fs.mkdir(path.join(workspaceRoot, 'generated'));
    await fs.writeFile(path.join(workspaceRoot, 'entry.ts'), "import { target } from './target';\ntarget();\n");
    await fs.writeFile(path.join(workspaceRoot, 'target.ts'), 'export function target(): void {}\n');
    await fs.writeFile(path.join(workspaceRoot, 'generated/output.ts'), 'export function generated(): void {}\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      filterPatterns: ['**/generated/**'],
      nodeVisibility: { 'symbol:function': true },
      edgeVisibility: { call: false },
    });
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    const nodeReport = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'nodes',
      arguments: {},
    });
    const edgeReport = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'edges',
      arguments: {},
    });

    expect(nodeReport.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        nodeType: 'symbol',
        symbol: expect.objectContaining({
          name: 'target',
          kind: 'function',
          filePath: 'target.ts',
        }),
      }),
    ]));
    expect(nodeReport.nodes).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ path: expect.stringContaining('generated/output.ts') }),
    ]));
    expect(nodeReport.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'entry.ts', nodeType: 'file' }),
    ]));
    expect(edgeReport.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ edgeTypes: expect.arrayContaining(['import']) }),
    ]));
    expect(edgeReport.edges).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ edgeTypes: expect.arrayContaining(['call']) }),
    ]));

    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      edgeVisibility: { import: false, call: false, contains: false },
    });
    const pathReport = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'paths',
      arguments: { from: 'entry.ts', to: 'target.ts' },
    });
    expect(pathReport.paths).toEqual([]);
  });

  it('indexes symbols once and reveals them when symbol scope is enabled', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-cli-symbol-upgrade-'));
    await fs.writeFile(path.join(workspaceRoot, 'target.ts'), 'export function target(): void {}\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const baselineCache = loadWorkspaceAnalysisDatabaseCache(workspaceRoot);
    expect(readAnalysisCacheTiers(baselineCache.files['target.ts']!.analysis)).toContain('baseline');
    expect(readAnalysisCacheTiers(baselineCache.files['target.ts']!.analysis)).toContain('symbols');
    expect(baselineCache.files['target.ts']!.analysis.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'target', kind: 'function' }),
    ]));
    const outputs: string[] = [];

    await expect(runCli([
      '-C', workspaceRoot, 'scope', 'node', 'symbol:function', 'on',
    ], { stdout: output => { outputs.push(output); } })).resolves.toBe(0);

    expect(JSON.parse(outputs[0])).toMatchObject({
      data: {
        indexRequired: false,
      },
    });
    expect(readCodeGraphyWorkspaceStatusForCli({ workspacePath: workspaceRoot }).state).toBe('fresh');
    const nodeReport = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'nodes',
      arguments: {},
    });
    expect(nodeReport.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        nodeType: 'symbol',
        symbol: expect.objectContaining({ name: 'target', kind: 'function' }),
      }),
    ]));
  });

  it('expands file convenience queries across visible symbol endpoints', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-cli-file-intent-'));
    await fs.writeFile(path.join(workspaceRoot, 'app.ts'), "import { greet } from './greet';\ngreet();\n");
    await fs.writeFile(path.join(workspaceRoot, 'greet.ts'), 'export function greet(): void {}\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      nodeVisibility: { 'symbol:function': true },
      edgeVisibility: { import: false, call: true, contains: true },
    });
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const outputs: string[] = [];
    const stdout = (output: string): void => { outputs.push(output); };

    await runCli(['-C', workspaceRoot, 'dependents', 'greet.ts'], { stdout });
    await runCli(['-C', workspaceRoot, 'path', 'app.ts', 'greet.ts'], { stdout });

    expect(JSON.parse(outputs[0]).data.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'app.ts', to: 'greet.ts' }),
    ]));
    expect(JSON.parse(outputs[1]).data.paths).toContainEqual(['app.ts', 'greet.ts']);
  });

  it('emits high-signal verbose diagnostics for indexing requests', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-diagnostics-workspace-'));
    await fs.writeFile(path.join(workspaceRoot, 'Home.md'), 'See [[Target.md]].\n', 'utf-8');
    await fs.writeFile(path.join(workspaceRoot, 'Target.md'), 'Done.\n', 'utf-8');
    const diagnostics = collectDiagnosticEvents(true);

    await requestCodeGraphyIndexWorkspace({
      workspacePath: workspaceRoot,
      diagnostics,
    });

    expect(diagnostics.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        area: 'workspace',
        event: 'index-started',
        context: expect.objectContaining({
          operationId: expect.any(String),
          workspaceRoot,
        }),
      }),
      expect.objectContaining({
        area: 'indexing',
        event: 'completed',
        context: expect.objectContaining({
          operationId: expect.any(String),
          files: 2,
          nodes: 2,
          graphCache: '.codegraphy/graph.sqlite',
        }),
      }),
    ]));
    expect(diagnostics.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        area: 'indexing',
        event: 'phase-completed',
        context: expect.objectContaining({
          phase: 'discover-files',
          durationMs: expect.any(Number),
          files: 2,
        }),
      }),
      expect.objectContaining({
        area: 'indexing',
        event: 'phase-completed',
        context: expect.objectContaining({
          phase: 'analyze-files',
          durationMs: expect.any(Number),
          files: 2,
        }),
      }),
      expect.objectContaining({
        area: 'indexing',
        event: 'phase-completed',
        context: expect.objectContaining({
          phase: 'build-graph',
          durationMs: expect.any(Number),
          nodes: 2,
        }),
      }),
    ]));
  });

  it('emits factual verbose diagnostics for status requests', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-status-diagnostics-'));
    const diagnostics = collectDiagnosticEvents(true);

    readCodeGraphyWorkspaceStatusForCli({
      workspacePath: workspaceRoot,
      diagnostics,
    });

    expect(diagnostics.events).toContainEqual(expect.objectContaining({
      area: 'workspace',
      event: 'status-read',
      context: expect.objectContaining({
        workspaceRoot,
        state: 'missing',
        hasGraphCache: false,
        staleReasons: ['never-indexed'],
        enabledPluginCount: 1,
      }),
    }));
  });

  it('emits factual verbose diagnostics for graph query requests', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-diagnostics-'));
    await fs.writeFile(path.join(workspaceRoot, 'Home.md'), 'See [[Target.md]].\n', 'utf-8');
    await fs.writeFile(path.join(workspaceRoot, 'Target.md'), 'Done.\n', 'utf-8');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const diagnostics = collectDiagnosticEvents(true);

    await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'edges',
      arguments: { from: 'Home.md' },
      diagnostics,
    });

    expect(diagnostics.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        area: 'graph-query',
        event: 'started',
        context: expect.objectContaining({
          operationId: expect.any(String),
          workspaceRoot,
          report: 'edges',
        }),
      }),
      expect.objectContaining({
        area: 'graph-query',
        event: 'completed',
        context: expect.objectContaining({
          operationId: expect.any(String),
          report: 'edges',
          cacheState: 'fresh',
          nodeCount: 2,
          edgeCount: 1,
        }),
      }),
    ]));
  });
});
