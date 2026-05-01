import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphQueryRequest } from '../../../src/core/graphQuery';
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
      page: { offset: 0, limit: 500, returned: 1, total: 1 },
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
          page: { offset: 0, limit: 500, returned: 1, total: 1 },
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
      expect.stringContaining('unsupported'),
    );
  });
});
