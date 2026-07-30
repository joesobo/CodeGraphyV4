import { describe, expect, it, vi } from 'vitest';
import type { CodeGraphyWorkspaceCommandResponse } from '@codegraphy-dev/core';
import { handleCodeGraphyAgentUri } from '../../../../src/extension/agentBridge/uri/handle';
import type {
  CodeGraphyAgentRequest,
  CodeGraphyAgentUriDependencies,
  CodeGraphyAgentUriLike,
} from '../../../../src/extension/agentBridge/uri/types';

function createDependencies(
  request: CodeGraphyAgentRequest,
  workspaceRoot?: string,
): CodeGraphyAgentUriDependencies {
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
  };
  return {
    executeWorkspaceCommand: vi.fn(async () => response),
    getWorkspaceRoot: vi.fn(() => workspaceRoot),
    readRequestFile: vi.fn(async () => request),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    writeResponseFile: vi.fn(async () => undefined),
  };
}

function createUri(path: string, query = 'request=/tmp/request.json'): CodeGraphyAgentUriLike {
  return { path, query };
}

describe('agentBridge/uri/handle', () => {
  it('returns unsupported-action before reading a request file', async () => {
    const dependencies = createDependencies({
      repo: '/workspace/project',
      responsePath: '/tmp/response.json',
    });

    const result = await handleCodeGraphyAgentUri(
      createUri('/unsupported'),
      { refresh: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('unsupported-action');
    expect(dependencies.readRequestFile).not.toHaveBeenCalled();
  });

  it('returns missing-request before checking the workspace', async () => {
    const dependencies = createDependencies({
      repo: '/workspace/project',
      responsePath: '/tmp/response.json',
    });

    const result = await handleCodeGraphyAgentUri(
      createUri('/index', ''),
      { refresh: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('missing-request');
    expect(dependencies.getWorkspaceRoot).not.toHaveBeenCalled();
  });

  it('returns workspace guard failures before dispatching the action', async () => {
    const refresh = vi.fn();
    const dependencies = createDependencies({
      repo: '/workspace/project',
      responsePath: '/tmp/response.json',
    });

    const result = await handleCodeGraphyAgentUri(
      createUri('/index'),
      { refresh },
      dependencies,
    );

    expect(result.status).toBe('missing-workspace');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('dispatches valid requests after action, request, and workspace checks pass', async () => {
    const refresh = vi.fn(async () => undefined);
    const dependencies = createDependencies({
      repo: '/workspace/project',
      responsePath: '/tmp/response.json',
    }, '/workspace/project');

    const result = await handleCodeGraphyAgentUri(
      createUri('/index'),
      { refresh },
      dependencies,
    );

    expect(result.status).toBe('indexed');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
