import { describe, expect, it } from 'vitest';
import { requestGraphQuery } from '../../src/coreExtension/query';

describe('coreExtension/query', () => {
  it('returns the Graph Query result from the Core Extension response', async () => {
    await expect(requestGraphQuery(
      {
        repo: '/workspace/project',
        report: 'nodes',
        arguments: { search: 'GraphQuery' },
      },
      {
        sendQueryRequest: async () => ({
          requestId: 'request-1',
          repo: '/workspace/project',
          status: 'ok',
          result: {
            nodes: [],
            page: { offset: 0, limit: 500, returned: 0, total: 0 },
          },
        }),
      },
    )).resolves.toEqual({
      nodes: [],
      page: { offset: 0, limit: 500, returned: 0, total: 0 },
    });
  });

  it('returns a query error when the Core Extension reports failure', async () => {
    await expect(requestGraphQuery(
      {
        repo: '/workspace/project',
        report: 'nodes',
        arguments: {},
      },
      {
        sendQueryRequest: async () => ({
          requestId: 'request-2',
          repo: '/workspace/project',
          status: 'failed',
          error: 'Graph Cache not found',
        }),
      },
    )).resolves.toEqual({
      error: 'graph_query_failed',
      message: 'Graph Cache not found',
    });
  });
});
