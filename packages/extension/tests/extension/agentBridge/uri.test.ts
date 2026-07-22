import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphQueryRequest } from '@codegraphy-dev/core';
import { handleCodeGraphyAgentUri } from '../../../src/extension/agentBridge/uri';

function createDependencies(
  request: {
    repo: string;
    requestId?: string;
    responsePath: string;
    query?: GraphQueryRequest;
  },
  workspaceRoot?: string,
) {
  return {
    getWorkspaceRoot: () => workspaceRoot,
    readRequestFile: vi.fn(async () => request),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    writeResponseFile: vi.fn(async () => undefined),
  };
}

function createUri(action: string) {
  return {
    path: action,
    query: 'request=/tmp/codegraphy-request.json',
  };
}

function createUriWithoutRequest(action: string) {
  return {
    path: action,
    query: '',
  };
}

describe('agentBridge/uri', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs Indexing and writes an indexed response for the active workspace', async () => {
    const workspaceRoot = path.resolve('/workspace/project');
    const refreshIndex = vi.fn(async () => {});
    const dependencies = createDependencies({
      repo: workspaceRoot,
      requestId: 'request-1',
      responsePath: '/tmp/codegraphy-response.json',
    }, workspaceRoot);

    const result = await handleCodeGraphyAgentUri(
      createUri('/index'),
      { refreshIndex, queryGraph: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('indexed');
    expect(refreshIndex).toHaveBeenCalledTimes(1);
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      {
        repo: workspaceRoot,
        requestId: 'request-1',
        status: 'indexed',
      },
    );
  });

  it('runs Graph Query through the provider and writes the query response', async () => {
    const workspaceRoot = path.resolve('/workspace/project');
    const query: GraphQueryRequest = { report: 'nodes', arguments: {} };
    const queryGraph = vi.fn(() => ({
      nodes: [{ path: 'src/app.ts', nodeType: 'file' as const }],
      page: { offset: 0, limit: 500, returned: 1, total: 1, nextOffset: null },
    }));
    const dependencies = createDependencies({
      repo: workspaceRoot,
      requestId: 'request-2',
      responsePath: '/tmp/codegraphy-response.json',
      query,
    }, workspaceRoot);

    const result = await handleCodeGraphyAgentUri(
      createUri('/query'),
      { refreshIndex: vi.fn(), queryGraph },
      dependencies,
    );

    expect(result.status).toBe('queried');
    expect(queryGraph).toHaveBeenCalledWith(query);
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      {
        repo: workspaceRoot,
        requestId: 'request-2',
        status: 'ok',
        result: {
          nodes: [{ path: 'src/app.ts', nodeType: 'file' }],
          page: { offset: 0, limit: 500, returned: 1, total: 1, nextOffset: null },
        },
      },
    );
  });

  it('writes a failure when the receiving VS Code window is for another repo', async () => {
    const requestedRepo = path.resolve('/workspace/project');
    const dependencies = createDependencies({
      repo: requestedRepo,
      requestId: 'request-3',
      responsePath: '/tmp/codegraphy-response.json',
    }, path.resolve('/workspace/other'));

    const result = await handleCodeGraphyAgentUri(
      createUri('/index'),
      { refreshIndex: vi.fn(), queryGraph: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('wrong-workspace');
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      expect.objectContaining({
        repo: requestedRepo,
        requestId: 'request-3',
        status: 'failed',
      }),
    );
    expect(dependencies.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('targeted'),
    );
  });

  it('writes a failure when there is no workspace folder open', async () => {
    const requestedRepo = path.resolve('/workspace/project');
    const dependencies = createDependencies({
      repo: requestedRepo,
      requestId: 'request-4',
      responsePath: '/tmp/codegraphy-response.json',
    });

    const result = await handleCodeGraphyAgentUri(
      createUri('/index'),
      { refreshIndex: vi.fn(), queryGraph: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('missing-workspace');
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      {
        error: `CodeGraphy agent request for ${requestedRepo} needs a VS Code window opened on that repo.`,
        repo: requestedRepo,
        requestId: 'request-4',
        status: 'failed',
      },
    );
  });

  it('ignores supported actions when no request file is provided', async () => {
    const dependencies = createDependencies({
      repo: path.resolve('/workspace/project'),
      responsePath: '/tmp/codegraphy-response.json',
    }, path.resolve('/workspace/project'));

    const result = await handleCodeGraphyAgentUri(
      createUriWithoutRequest('/index'),
      { refreshIndex: vi.fn(), queryGraph: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('missing-request');
    expect(dependencies.readRequestFile).not.toHaveBeenCalled();
    expect(dependencies.writeResponseFile).not.toHaveBeenCalled();
    expect(dependencies.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('request file'),
    );
  });

  it('writes a failure response when indexing throws', async () => {
    const workspaceRoot = path.resolve('/workspace/project');
    const dependencies = createDependencies({
      repo: workspaceRoot,
      requestId: 'request-5',
      responsePath: '/tmp/codegraphy-response.json',
    }, workspaceRoot);

    const result = await handleCodeGraphyAgentUri(
      createUri('/index'),
      {
        refreshIndex: vi.fn(async () => {
          throw new Error('index failed');
        }),
        queryGraph: vi.fn(),
      },
      dependencies,
    );

    expect(result.status).toBe('failed');
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      expect.objectContaining({
        error: 'index failed',
        repo: workspaceRoot,
        requestId: 'request-5',
        status: 'failed',
      }),
    );
    expect(dependencies.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('index failed'),
    );
  });

  it('writes a failure response when querying throws', async () => {
    const workspaceRoot = path.resolve('/workspace/project');
    const dependencies = createDependencies({
      repo: workspaceRoot,
      requestId: 'request-6',
      responsePath: '/tmp/codegraphy-response.json',
      query: { report: 'nodes', arguments: {} },
    }, workspaceRoot);

    const result = await handleCodeGraphyAgentUri(
      createUri('/query'),
      {
        refreshIndex: vi.fn(),
        queryGraph: vi.fn(() => {
          throw new Error('query failed');
        }),
      },
      dependencies,
    );

    expect(result.status).toBe('failed');
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      expect.objectContaining({
        error: 'query failed',
        repo: workspaceRoot,
        requestId: 'request-6',
        status: 'failed',
      }),
    );
    expect(dependencies.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('query failed'),
    );
  });

  it('ignores unsupported actions', async () => {
    const dependencies = createDependencies({
      repo: path.resolve('/workspace/project'),
      responsePath: '/tmp/codegraphy-response.json',
    }, path.resolve('/workspace/project'));

    const result = await handleCodeGraphyAgentUri(
      createUri('/unknown'),
      { refreshIndex: vi.fn(), queryGraph: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('unsupported-action');
    expect(dependencies.writeResponseFile).not.toHaveBeenCalled();
    expect(dependencies.showWarningMessage).toHaveBeenCalledWith(
      'CodeGraphy ignored unsupported agent request: /unknown.',
    );
  });
});
