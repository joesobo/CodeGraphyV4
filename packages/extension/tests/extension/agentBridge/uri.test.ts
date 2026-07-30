import type {
  CodeGraphyWorkspaceCommand,
  CodeGraphyWorkspaceCommandResponse,
  GraphQueryRequest,
} from '@codegraphy-dev/core';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { handleCodeGraphyAgentUri } from '../../../src/extension/agentBridge/uri';

const workspaceRoot = path.resolve('/workspace/project');

const freshMetadata: CodeGraphyWorkspaceCommandResponse['metadata'] = {
  workspaceRoot,
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
  request: {
    repo: string;
    requestId?: string;
    responsePath: string;
    query?: GraphQueryRequest;
  },
  response: CodeGraphyWorkspaceCommandResponse,
  activeWorkspace?: string,
) {
  return {
    executeWorkspaceCommand: vi.fn(async (_command: CodeGraphyWorkspaceCommand) => response),
    getWorkspaceRoot: () => activeWorkspace,
    readRequestFile: vi.fn(async () => request),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    writeResponseFile: vi.fn(async () => undefined),
  };
}

function createUri(action: string, withRequest = true) {
  return {
    path: action,
    query: withRequest ? 'request=/tmp/codegraphy-request.json' : '',
  };
}

describe('agentBridge/uri', () => {
  it('runs Core Indexing and reloads the Graph View for the active workspace', async () => {
    const response: CodeGraphyWorkspaceCommandResponse = {
      ok: true,
      command: 'index',
      data: {
        workspaceRoot,
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
    const dependencies = createDependencies({
      repo: workspaceRoot,
      requestId: 'request-1',
      responsePath: '/tmp/codegraphy-response.json',
    }, response, workspaceRoot);
    const refresh = vi.fn(async () => undefined);

    const result = await handleCodeGraphyAgentUri(
      createUri('/index'),
      { refresh },
      dependencies,
    );

    expect(result.status).toBe('indexed');
    expect(refresh).toHaveBeenCalledOnce();
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      {
        repo: workspaceRoot,
        requestId: 'request-1',
        response,
      },
    );
  });

  it('runs live search through Core instead of the rendered Graph View', async () => {
    const query: GraphQueryRequest = {
      report: 'search',
      arguments: { pattern: 'settings' },
    };
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
    const dependencies = createDependencies({
      repo: workspaceRoot,
      requestId: 'request-2',
      responsePath: '/tmp/codegraphy-response.json',
      query,
    }, response, workspaceRoot);

    const result = await handleCodeGraphyAgentUri(
      createUri('/query'),
      { refresh: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('queried');
    expect(dependencies.executeWorkspaceCommand).toHaveBeenCalledWith({
      command: 'query',
      query,
      workspacePath: workspaceRoot,
    });
  });

  it('reads Core freshness status through the URI bridge', async () => {
    const response: CodeGraphyWorkspaceCommandResponse = {
      ok: true,
      command: 'status',
      data: {
        workspaceRoot,
        graphCache: '.codegraphy/graph.sqlite',
        state: 'stale',
        hasGraphCache: true,
        staleReasons: ['pending-changed-files'],
        enabledPlugins: [],
        message: 'Graph Cache is stale.',
      },
      metadata: {
        ...freshMetadata,
        cache: {
          state: 'stale',
          staleReasons: ['pending-changed-files'],
        },
      },
    };
    const dependencies = createDependencies({
      repo: workspaceRoot,
      requestId: 'request-3',
      responsePath: '/tmp/codegraphy-response.json',
    }, response, workspaceRoot);

    await expect(handleCodeGraphyAgentUri(
      createUri('/status'),
      { refresh: vi.fn() },
      dependencies,
    )).resolves.toEqual({ status: 'status-read' });
  });

  it('blocks a request received by the wrong VS Code workspace', async () => {
    const response = {
      ok: false,
      command: 'status',
      error: {
        code: 'unused',
        message: 'unused',
      },
      metadata: freshMetadata,
    } satisfies CodeGraphyWorkspaceCommandResponse;
    const dependencies = createDependencies({
      repo: workspaceRoot,
      requestId: 'request-4',
      responsePath: '/tmp/codegraphy-response.json',
    }, response, path.resolve('/workspace/other'));

    const result = await handleCodeGraphyAgentUri(
      createUri('/status'),
      { refresh: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('wrong-workspace');
    expect(dependencies.executeWorkspaceCommand).not.toHaveBeenCalled();
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      {
        error: expect.stringContaining('targeted'),
        repo: workspaceRoot,
        requestId: 'request-4',
      },
    );
  });

  it('blocks a request when no VS Code workspace is open', async () => {
    const response = {
      ok: false,
      command: 'status',
      error: {
        code: 'unused',
        message: 'unused',
      },
      metadata: freshMetadata,
    } satisfies CodeGraphyWorkspaceCommandResponse;
    const dependencies = createDependencies({
      repo: workspaceRoot,
      requestId: 'request-5',
      responsePath: '/tmp/codegraphy-response.json',
    }, response);

    const result = await handleCodeGraphyAgentUri(
      createUri('/status'),
      { refresh: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('missing-workspace');
    expect(dependencies.executeWorkspaceCommand).not.toHaveBeenCalled();
  });

  it('does not read files for unsupported actions or missing request paths', async () => {
    const response = {
      ok: false,
      command: 'status',
      error: {
        code: 'unused',
        message: 'unused',
      },
      metadata: freshMetadata,
    } satisfies CodeGraphyWorkspaceCommandResponse;
    const dependencies = createDependencies({
      repo: workspaceRoot,
      responsePath: '/tmp/codegraphy-response.json',
    }, response, workspaceRoot);

    await expect(handleCodeGraphyAgentUri(
      createUri('/unknown'),
      { refresh: vi.fn() },
      dependencies,
    )).resolves.toEqual({ status: 'unsupported-action' });
    await expect(handleCodeGraphyAgentUri(
      createUri('/status', false),
      { refresh: vi.fn() },
      dependencies,
    )).resolves.toEqual({ status: 'missing-request' });
    expect(dependencies.readRequestFile).not.toHaveBeenCalled();
  });
});
