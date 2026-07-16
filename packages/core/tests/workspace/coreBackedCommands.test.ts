import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { collectDiagnosticEvents } from '../../src/diagnostics/events';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { requestWorkspaceGraphQuery } from '../../src/workspace/requestQuery';
import { readCodeGraphyWorkspaceStatusForCli } from '../../src/workspace/requestStatus';

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
