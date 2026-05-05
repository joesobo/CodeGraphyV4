import { describe, expect, it, vi } from 'vitest';
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
  return {
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
      { refreshIndex: vi.fn(), queryGraph: vi.fn() },
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
      { refreshIndex: vi.fn(), queryGraph: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('missing-request');
    expect(dependencies.getWorkspaceRoot).not.toHaveBeenCalled();
  });

  it('returns workspace guard failures before dispatching the action', async () => {
    const refreshIndex = vi.fn();
    const dependencies = createDependencies({
      repo: '/workspace/project',
      responsePath: '/tmp/response.json',
    });

    const result = await handleCodeGraphyAgentUri(
      createUri('/index'),
      { refreshIndex, queryGraph: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('missing-workspace');
    expect(refreshIndex).not.toHaveBeenCalled();
  });

  it('dispatches valid requests after action, request, and workspace checks pass', async () => {
    const refreshIndex = vi.fn(async () => undefined);
    const dependencies = createDependencies({
      repo: '/workspace/project',
      responsePath: '/tmp/response.json',
    }, '/workspace/project');

    const result = await handleCodeGraphyAgentUri(
      createUri('/index'),
      { refreshIndex, queryGraph: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('indexed');
    expect(refreshIndex).toHaveBeenCalledTimes(1);
  });
});
