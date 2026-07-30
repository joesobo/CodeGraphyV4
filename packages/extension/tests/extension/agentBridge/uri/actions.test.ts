import type {
  CodeGraphyWorkspaceCommand,
  CodeGraphyWorkspaceCommandResponse,
} from '@codegraphy-dev/core';
import { describe, expect, it, vi } from 'vitest';
import { dispatchAgentAction } from '../../../../src/extension/agentBridge/uri/actions';
import type {
  CodeGraphyAgentRequest,
  CodeGraphyAgentUriDependencies,
} from '../../../../src/extension/agentBridge/uri/types';

const freshMetadata: CodeGraphyWorkspaceCommandResponse['metadata'] = {
  workspaceRoot: '/workspace/project',
  cache: {
    state: 'fresh',
    staleReasons: [],
  },
  result: {
    complete: true,
    reasons: [],
  },
};

function createDependencies(
  response: CodeGraphyWorkspaceCommandResponse,
): CodeGraphyAgentUriDependencies {
  return {
    executeWorkspaceCommand: vi.fn(async (_command: CodeGraphyWorkspaceCommand) => response),
    getWorkspaceRoot: () => '/workspace/project',
    readRequestFile: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    writeResponseFile: vi.fn(async () => undefined),
  };
}

function createRequest(query?: CodeGraphyAgentRequest['query']): CodeGraphyAgentRequest {
  return {
    repo: '/workspace/project',
    requestId: 'request-1',
    responsePath: '/tmp/codegraphy-response.json',
    ...(query ? { query } : {}),
  };
}

describe('agentBridge/uri/actions', () => {
  it('runs Indexing through Core and reloads the VS Code Graph View from the Graph Cache', async () => {
    const response: CodeGraphyWorkspaceCommandResponse = {
      ok: true,
      command: 'index',
      data: {
        workspaceRoot: '/workspace/project',
        graphCache: '.codegraphy/graph.sqlite',
        message: 'Indexing completed.',
        discovery: {
          indexedFiles: 1,
          totalFound: 1,
          limitReached: false,
        },
        indexing: {
          mode: 'incremental',
          analyzedFiles: 1,
          deletedFiles: 0,
          reusedFiles: 0,
        },
      },
      metadata: freshMetadata,
    };
    const dependencies = createDependencies(response);
    const refresh = vi.fn(async () => undefined);

    const result = await dispatchAgentAction(
      'index',
      createRequest(),
      { refresh },
      dependencies,
    );

    expect(result.status).toBe('indexed');
    expect(dependencies.executeWorkspaceCommand).toHaveBeenCalledWith({
      command: 'index',
      workspacePath: '/workspace/project',
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      {
        repo: '/workspace/project',
        requestId: 'request-1',
        response,
      },
    );
  });

  it('runs every Graph Query report through the Core workspace command seam', async () => {
    const response: CodeGraphyWorkspaceCommandResponse = {
      ok: true,
      command: 'query',
      data: {
        pattern: 'settings',
        matches: [],
        page: {
          offset: 0,
          limit: 20,
          returned: 0,
          total: 0,
          nextOffset: null,
        },
        sources: {
          text: {
            freshness: 'live',
            filesScanned: 1,
            filesSkipped: 0,
          },
          symbols: {
            freshness: 'cached',
            cacheState: 'fresh',
          },
        },
      },
      metadata: freshMetadata,
    };
    const dependencies = createDependencies(response);
    const query = {
      report: 'search' as const,
      arguments: { pattern: 'settings' },
    };

    const result = await dispatchAgentAction(
      'query',
      createRequest(query),
      { refresh: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('queried');
    expect(dependencies.executeWorkspaceCommand).toHaveBeenCalledWith({
      command: 'query',
      workspacePath: '/workspace/project',
      query,
    });
  });

  it('exposes Core workspace status without opening the Graph View', async () => {
    const response: CodeGraphyWorkspaceCommandResponse = {
      ok: true,
      command: 'status',
      data: {
        workspaceRoot: '/workspace/project',
        graphCache: '.codegraphy/graph.sqlite',
        state: 'fresh',
        hasGraphCache: true,
        staleReasons: [],
        enabledPlugins: [],
        message: 'Graph Cache is fresh.',
      },
      metadata: freshMetadata,
    };
    const dependencies = createDependencies(response);
    const refresh = vi.fn();

    const result = await dispatchAgentAction(
      'status',
      createRequest(),
      { refresh },
      dependencies,
    );

    expect(result.status).toBe('status-read');
    expect(dependencies.executeWorkspaceCommand).toHaveBeenCalledWith({
      command: 'status',
      workspacePath: '/workspace/project',
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('writes Core command failures and shows the Core error message', async () => {
    const response: CodeGraphyWorkspaceCommandResponse = {
      ok: false,
      command: 'query',
      error: {
        code: 'graph_cache_not_found',
        message: 'Run Indexing first.',
      },
      metadata: {
        ...freshMetadata,
        cache: {
          state: 'missing',
          staleReasons: ['never-indexed'],
        },
        result: {
          complete: false,
          reasons: ['cache-missing'],
        },
      },
    };
    const dependencies = createDependencies(response);

    const result = await dispatchAgentAction(
      'query',
      createRequest({
        report: 'nodes',
        arguments: {},
      }),
      { refresh: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('failed');
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      {
        repo: '/workspace/project',
        requestId: 'request-1',
        response,
      },
    );
    expect(dependencies.showErrorMessage).toHaveBeenCalledWith(
      'CodeGraphy query failed for /workspace/project: Run Indexing first.',
    );
  });
});
