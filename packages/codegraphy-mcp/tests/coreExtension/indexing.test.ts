import { describe, expect, it } from 'vitest';
import { requestCodeGraphyIndexRepo } from '../../src/coreExtension/indexing';

describe('coreExtension/indexing', () => {
  it('returns a small success result when the Core Extension indexes the repo', async () => {
    await expect(requestCodeGraphyIndexRepo(
      { repo: '/workspace/project' },
      {
        sendIndexRequest: async () => ({
          requestId: 'request-1',
          repo: '/workspace/project',
          status: 'indexed',
        }),
      },
    )).resolves.toEqual({
      repo: '/workspace/project',
      graphCache: '.codegraphy/graph.lbug',
      message: 'CodeGraphy indexing completed. Query tools can now read the Graph Cache.',
    });
  });

  it('returns the Core Extension failure without falling back to status checks', async () => {
    await expect(requestCodeGraphyIndexRepo(
      { repo: '/workspace/project' },
      {
        sendIndexRequest: async () => ({
          requestId: 'request-2',
          repo: '/workspace/project',
          status: 'failed',
          error: 'VS Code is unavailable',
        }),
      },
    )).resolves.toEqual({
      error: 'indexing_failed',
      message: 'VS Code is unavailable',
      repo: '/workspace/project',
    });
  });
});
