import { describe, expect, it, vi } from 'vitest';
import type {
  IndexWorkspaceResult,
  WorkspaceGraphQueryInput,
  WorkspaceGraphQueryResult,
  WorkspacePathInput,
  WorkspaceStatusResult,
} from '../../src/workspace/requestTypes';
import {
  executeCodeGraphyWorkspaceCommand,
  type CodeGraphyWorkspaceCommandDependencies,
} from '../../src/workspace/command';

function createStatus(
  state: WorkspaceStatusResult['state'] = 'fresh',
  staleReasons: string[] = [],
): WorkspaceStatusResult {
  return {
    workspaceRoot: '/workspace/project',
    graphCache: '.codegraphy/graph.sqlite',
    state,
    hasGraphCache: state !== 'missing',
    staleReasons,
    enabledPlugins: ['codegraphy.markdown'],
    message: `Graph Cache is ${state}.`,
  };
}

function createIndexResult(limitReached = false): IndexWorkspaceResult {
  return {
    workspaceRoot: '/workspace/project',
    graphCache: '.codegraphy/graph.sqlite',
    message: 'Indexing completed.',
    discovery: {
      indexedFiles: 10,
      totalFound: limitReached ? 12 : 10,
      limitReached,
    },
    indexing: {
      mode: 'incremental',
      analyzedFiles: 2,
      deletedFiles: 0,
      reusedFiles: 8,
    },
  };
}

function createDependencies(
  options: {
    status?: WorkspaceStatusResult;
    query?: WorkspaceGraphQueryResult;
    index?: IndexWorkspaceResult;
  } = {},
): CodeGraphyWorkspaceCommandDependencies {
  return {
    cwd: () => '/workspace/project',
    indexWorkspace: vi.fn(async (_input: WorkspacePathInput) =>
      options.index ?? createIndexResult()),
    queryWorkspace: vi.fn(async (_input: WorkspaceGraphQueryInput) =>
      options.query ?? {
        nodes: [],
        page: {
          offset: 0,
          limit: 100,
          returned: 0,
          total: 0,
          nextOffset: null,
        },
        workspaceRoot: '/workspace/project',
        cacheStatus: { state: 'fresh', staleReasons: [] },
      }),
    readStatus: vi.fn((_input: WorkspacePathInput) =>
      options.status ?? createStatus()),
  };
}

describe('workspace/command', () => {
  it('returns status through one transport-neutral response envelope', async () => {
    const dependencies = createDependencies();

    await expect(executeCodeGraphyWorkspaceCommand({
      command: 'status',
      workspacePath: '/workspace/project',
    }, dependencies)).resolves.toEqual({
      ok: true,
      command: 'status',
      data: createStatus(),
      metadata: {
        workspaceRoot: '/workspace/project',
        cache: {
          state: 'fresh',
          staleReasons: [],
        },
        result: {
          complete: true,
          reasons: [],
        },
      },
    });
  });

  it('reports stale cache provenance and bounded query pagination separately', async () => {
    const dependencies = createDependencies({
      status: createStatus('stale', ['pending-changed-files']),
      query: {
        nodes: [{ path: 'src/app.ts', nodeType: 'file' }],
        page: {
          offset: 0,
          limit: 1,
          returned: 1,
          total: 2,
          nextOffset: 1,
        },
        workspaceRoot: '/workspace/project',
        cacheStatus: {
          state: 'stale',
          staleReasons: ['pending-changed-files'],
        },
      },
    });

    const result = await executeCodeGraphyWorkspaceCommand({
      command: 'query',
      workspacePath: '/workspace/project',
      query: {
        report: 'nodes',
        arguments: { limit: 1 },
      },
    }, dependencies);

    expect(result).toMatchObject({
      ok: true,
      command: 'query',
      metadata: {
        cache: {
          state: 'stale',
          staleReasons: ['pending-changed-files'],
        },
        result: {
          complete: false,
          reasons: ['page-truncated'],
        },
      },
    });
    expect(dependencies.queryWorkspace).toHaveBeenCalledWith({
      workspacePath: '/workspace/project',
      report: 'nodes',
      arguments: { limit: 1 },
    });
  });

  it('reports Indexing file-budget limits as incomplete results', async () => {
    const dependencies = createDependencies({
      index: createIndexResult(true),
    });

    const result = await executeCodeGraphyWorkspaceCommand({
      command: 'index',
      workspacePath: '/workspace/project',
    }, dependencies);

    expect(result).toMatchObject({
      ok: true,
      command: 'index',
      metadata: {
        result: {
          complete: false,
          reasons: ['file-budget-reached'],
        },
      },
    });
  });

  it('turns Core query failures into the same response contract', async () => {
    const dependencies = createDependencies({
      status: createStatus('missing', ['never-indexed']),
      query: {
        error: 'graph_cache_not_found',
        message: 'Run Indexing first.',
        workspaceRoot: '/workspace/project',
      },
    });

    await expect(executeCodeGraphyWorkspaceCommand({
      command: 'query',
      query: {
        report: 'search',
        arguments: { pattern: 'settings' },
      },
    }, dependencies)).resolves.toEqual({
      ok: false,
      command: 'query',
      error: {
        code: 'graph_cache_not_found',
        message: 'Run Indexing first.',
      },
      metadata: {
        workspaceRoot: '/workspace/project',
        cache: {
          state: 'missing',
          staleReasons: ['never-indexed'],
        },
        result: {
          complete: false,
          reasons: ['cache-missing'],
        },
      },
    });
  });

  it('returns thrown failures without leaking transport-specific errors', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.indexWorkspace).mockRejectedValueOnce(new Error('Indexing failed'));

    const result = await executeCodeGraphyWorkspaceCommand({
      command: 'index',
    }, dependencies);

    expect(result).toEqual({
      ok: false,
      command: 'index',
      error: {
        code: 'workspace_command_failed',
        message: 'Indexing failed',
      },
      metadata: {
        workspaceRoot: '/workspace/project',
        cache: {
          state: 'fresh',
          staleReasons: [],
        },
        result: {
          complete: false,
          reasons: ['command-failed'],
        },
      },
    });
  });
});
