import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    loadWorkspaceAnalysisDatabaseCache,
} from '../../src/graphCache/database/storage';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { requestWorkspaceGraphQuery } from '../../src/workspace/requestQuery';
import { readCodeGraphyWorkspaceStatusForCli } from '../../src/workspace/requestStatus';
import {
    readCodeGraphyWorkspaceSettings,
    writeCodeGraphyWorkspaceSettings,
} from '../../src/workspace/settings';

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
    const repeatIndex = await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    expect(readCodeGraphyWorkspaceStatusForCli({ workspacePath: workspaceRoot })).toMatchObject({
      state: 'fresh',
      staleReasons: [],
    });
    expect(repeatIndex.indexing).toEqual({
      mode: 'incremental',
      analyzedFiles: 0,
      deletedFiles: 0,
      reusedFiles: 1,
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

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot).files).toHaveProperty(
      'generated/output.ts',
    );

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
        nodeType: 'symbol:function',
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
});
