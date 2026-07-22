import { describe, expect, it, vi } from 'vitest';
import {
  dispatchAgentAction,
  formatErrorMessage,
} from '../../../../src/extension/agentBridge/uri/actions';
import type {
  CodeGraphyAgentRequest,
  CodeGraphyAgentUriDependencies,
} from '../../../../src/extension/agentBridge/uri/types';

function createDependencies(): CodeGraphyAgentUriDependencies {
  return {
    getWorkspaceRoot: () => '/workspace/project',
    readRequestFile: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    writeResponseFile: vi.fn(async () => undefined),
  };
}

function createRequest(query?: unknown): CodeGraphyAgentRequest {
  return {
    repo: '/workspace/project',
    requestId: 'request-1',
    responsePath: '/tmp/codegraphy-response.json',
    ...(query ? { query } : {}),
  };
}

describe('agentBridge/uri/actions', () => {
  it('formats non-error failures without losing the value', () => {
    expect(formatErrorMessage('plain failure')).toBe('plain failure');
  });

  it('dispatches indexing requests through the provider', async () => {
    const dependencies = createDependencies();
    const refreshIndex = vi.fn(async () => undefined);

    const result = await dispatchAgentAction(
      'index',
      createRequest(),
      { refreshIndex, queryGraph: vi.fn() },
      dependencies,
    );

    expect(result.status).toBe('indexed');
    expect(refreshIndex).toHaveBeenCalledTimes(1);
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      {
        repo: '/workspace/project',
        requestId: 'request-1',
        status: 'indexed',
      },
    );
  });

  it('writes failed index responses with error messages', async () => {
    const dependencies = createDependencies();

    const result = await dispatchAgentAction(
      'index',
      createRequest(),
      {
        refreshIndex: vi.fn(async () => {
          throw new Error('index exploded');
        }),
        queryGraph: vi.fn(),
      },
      dependencies,
    );

    expect(result.status).toBe('failed');
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      {
        error: 'index exploded',
        repo: '/workspace/project',
        requestId: 'request-1',
        status: 'failed',
      },
    );
    expect(dependencies.showErrorMessage).toHaveBeenCalledWith(
      'CodeGraphy failed to index /workspace/project: index exploded',
    );
  });

  it('dispatches query requests through the provider', async () => {
    const dependencies = createDependencies();
    const query = { report: 'nodes' as const, arguments: {} };
    const queryGraph = vi.fn(() => ({
      nodes: [{ path: 'src/app.ts', nodeType: 'file' as const }],
      page: { offset: 0, limit: 500, returned: 1, total: 1, nextOffset: null },
    }));

    const result = await dispatchAgentAction(
      'query',
      createRequest(query),
      { refreshIndex: vi.fn(), queryGraph },
      dependencies,
    );

    expect(result.status).toBe('queried');
    expect(queryGraph).toHaveBeenCalledWith(query);
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      {
        repo: '/workspace/project',
        requestId: 'request-1',
        result: {
          nodes: [{ path: 'src/app.ts', nodeType: 'file' }],
          page: { offset: 0, limit: 500, returned: 1, total: 1, nextOffset: null },
        },
        status: 'ok',
      },
    );
  });

  it('writes failed query responses with string errors', async () => {
    const dependencies = createDependencies();

    const result = await dispatchAgentAction(
      'query',
      createRequest({ report: 'nodes', arguments: {} }),
      {
        refreshIndex: vi.fn(),
        queryGraph: vi.fn(() => {
          throw 'query exploded';
        }),
      },
      dependencies,
    );

    expect(result.status).toBe('failed');
    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/codegraphy-response.json',
      {
        error: 'query exploded',
        repo: '/workspace/project',
        requestId: 'request-1',
        status: 'failed',
      },
    );
    expect(dependencies.showErrorMessage).toHaveBeenCalledWith(
      'CodeGraphy failed to query /workspace/project: query exploded',
    );
  });
});
