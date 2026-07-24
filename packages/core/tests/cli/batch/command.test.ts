import { describe, expect, it, vi } from 'vitest';
import { runBatchCommand } from '../../../src/cli/batch/command';

describe('cli/batch/command', () => {
  it('runs existing query argv against one workspace request', async () => {
    const queryBatch = vi.fn(async () => ({
      results: [
        { nodes: [], page: { offset: 0, limit: 5, returned: 0, total: 0, nextOffset: null } },
        {
          edges: [{ from: 'src/app.ts', to: 'src/model.ts', edgeTypes: ['import'] }],
          page: { offset: 0, limit: 100, returned: 1, total: 1, nextOffset: null },
        },
      ],
    }));

    const result = await runBatchCommand({ name: 'batch', workspacePath: '/workspace' }, {
      cwd: () => '/caller',
      readInput: async () => JSON.stringify({
        queries: [
          { id: 'files', argv: ['nodes', '--limit', '5'] },
          { id: 'outgoing', argv: ['dependencies', '/workspace/src/app.ts'] },
        ],
      }),
      queryBatch,
    });

    expect(queryBatch).toHaveBeenCalledWith({
      workspacePath: '/workspace',
      queries: [
        { report: 'nodes', arguments: { limit: 5 } },
        {
          report: 'edges',
          arguments: {
            from: 'src/app.ts',
            expandFileSelectors: true,
            projectFileEndpoints: true,
            limit: 100,
          },
        },
      ],
    });
    expect(JSON.parse(result.output)).toEqual({
      results: [
        {
          id: 'files',
          command: 'nodes',
          data: { nodes: [], page: { offset: 0, limit: 5, returned: 0, total: 0, nextOffset: null } },
        },
        {
          id: 'outgoing',
          command: 'dependencies',
          data: {
            edges: [{ from: 'src/app.ts', to: 'src/model.ts', edgeTypes: ['import'] }],
            page: { offset: 0, limit: 100, returned: 1, total: 1, nextOffset: null },
          },
        },
      ],
    });
  });

  it('rejects malformed input before querying', async () => {
    const queryBatch = vi.fn();

    await expect(runBatchCommand({ name: 'batch' }, {
      cwd: () => '/workspace',
      readInput: async () => JSON.stringify({
        queries: [{ id: 'broken', argv: ['path', 'src/app.ts'] }],
      }),
      queryBatch,
    })).resolves.toEqual({
      exitCode: 2,
      output: JSON.stringify({
        error: 'invalid_arguments',
        message: 'Batch query broken: path requires <from> <to>',
      }),
    });
    expect(queryBatch).not.toHaveBeenCalled();
  });

  it('reports unsafe selectors as invalid Batch queries', async () => {
    const queryBatch = vi.fn();

    await expect(runBatchCommand({ name: 'batch' }, {
      cwd: () => '/workspace',
      readInput: async () => JSON.stringify({
        queries: [{ id: 'outside', argv: ['dependencies', '../outside.ts'] }],
      }),
      queryBatch,
    })).resolves.toEqual({
      exitCode: 2,
      output: JSON.stringify({
        error: 'invalid_arguments',
        message: 'Batch query outside: Query path is outside the workspace: ../outside.ts',
      }),
    });
    expect(queryBatch).not.toHaveBeenCalled();
  });

  it('requires unique query ids and a bounded query list', async () => {
    const queryBatch = vi.fn();
    const dependencies = {
      cwd: () => '/workspace',
      readInput: async () => JSON.stringify({
        queries: [
          { id: 'same', argv: ['nodes'] },
          { id: 'same', argv: ['edges'] },
        ],
      }),
      queryBatch,
    };

    await expect(runBatchCommand({ name: 'batch' }, dependencies)).resolves.toMatchObject({
      exitCode: 2,
      output: expect.stringContaining('Batch query ids must be unique: same'),
    });
    expect(queryBatch).not.toHaveBeenCalled();
  });
});
