import { describe, expect, it, vi } from 'vitest';
import { runBatchCommand } from '../../../src/cli/batch/command';
import { runCli } from '../../../src/cli/run';

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

  it('routes the final success and failure envelopes through the CLI runtime', async () => {
    const successStdout = vi.fn();
    const successStderr = vi.fn();
    const successDependencies = {
      cwd: () => '/workspace',
      readInput: async () => JSON.stringify({ queries: [{ id: 'files', argv: ['nodes'] }] }),
      queryBatch: async () => ({ results: [{ nodes: [], page: {} }] }),
    };

    await expect(runCli(['batch'], {
      runCommand: command => runBatchCommand(command, successDependencies),
      stdout: successStdout,
      stderr: successStderr,
    })).resolves.toBe(0);
    expect(JSON.parse(successStdout.mock.calls[0][0])).toMatchObject({
      ok: true,
      command: 'batch',
      data: { results: [{ id: 'files', command: 'nodes' }] },
    });
    expect(successStderr).not.toHaveBeenCalled();

    const failureStdout = vi.fn();
    const failureStderr = vi.fn();
    await expect(runCli(['batch'], {
      runCommand: command => runBatchCommand(command, {
        ...successDependencies,
        readInput: async () => '{',
      }),
      stdout: failureStdout,
      stderr: failureStderr,
    })).resolves.toBe(2);
    expect(failureStdout).not.toHaveBeenCalled();
    expect(JSON.parse(failureStderr.mock.calls[0][0])).toMatchObject({
      ok: false,
      command: 'batch',
      error: { code: 'invalid_arguments' },
    });
  });

  it('forwards verbose Graph Query diagnostics to stderr', async () => {
    const diagnostics: string[] = [];

    await runBatchCommand({ name: 'batch', verbose: true }, {
      cwd: () => '/workspace',
      readInput: async () => JSON.stringify({ queries: [{ id: 'files', argv: ['nodes'] }] }),
      queryBatch: async (input) => {
        input.diagnostics?.emit({
          area: 'graph-query',
          event: 'started',
          context: { operationId: 'query-1', report: 'nodes', workspaceRoot: '/workspace' },
        });
        return { results: [{ nodes: [], page: {} }] };
      },
    }, {
      writeDiagnostic: line => diagnostics.push(line),
    });

    expect(diagnostics).toEqual([
      '[CodeGraphy] Starting Graph Query: report=nodes, operation=query-1, workspace=/workspace',
    ]);
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

  it('correlates operational failures with the query id', async () => {
    const result = await runBatchCommand({ name: 'batch' }, {
      cwd: () => '/workspace',
      readInput: async () => JSON.stringify({
        queries: [
          { id: 'files', argv: ['nodes'] },
          { id: 'uses', argv: ['dependencies', 'src/app.ts'] },
        ],
      }),
      queryBatch: async () => ({
        results: [
          { nodes: [], page: {} },
          { error: 'graph_cache_not_found', message: 'Index first.' },
        ],
      }),
    });

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.output)).toMatchObject({
      error: {
        code: 'batch_query_failed',
        details: {
          id: 'uses',
          command: 'dependencies',
          error: { code: 'graph_cache_not_found', message: 'Index first.' },
        },
      },
    });
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

  it('requires unique query ids', async () => {
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

  it('accepts 1 through 100 queries', async () => {
    const maxQueries = Array.from(
      { length: 100 },
      (_, index) => ({ id: String(index), argv: ['nodes'] }),
    );
    const queryBatch = vi.fn(async (input) => ({
      results: input.queries.map(() => ({ nodes: [], page: {} })),
    }));
    await expect(runBatchCommand({ name: 'batch' }, {
      cwd: () => '/workspace',
      readInput: async () => JSON.stringify({ queries: maxQueries }),
      queryBatch,
    })).resolves.toMatchObject({ exitCode: 0 });

    for (const queries of [
      [],
      Array.from({ length: 101 }, (_, index) => ({ id: String(index), argv: ['nodes'] })),
    ]) {
      await expect(runBatchCommand({ name: 'batch' }, {
        cwd: () => '/workspace',
        readInput: async () => JSON.stringify({ queries }),
        queryBatch,
      })).resolves.toMatchObject({
        exitCode: 2,
        output: expect.stringContaining('Batch queries must contain 1 through 100 items'),
      });
    }
    expect(queryBatch).toHaveBeenCalledTimes(1);
  });

  it('accepts ids through 128 characters and rejects longer ids', async () => {
    const queryBatch = vi.fn(async () => ({ results: [{ nodes: [], page: {} }] }));
    const run = (id: string) => runBatchCommand({ name: 'batch' }, {
      cwd: () => '/workspace',
      readInput: async () => JSON.stringify({ queries: [{ id, argv: ['nodes'] }] }),
      queryBatch,
    });

    await expect(run('a'.repeat(128))).resolves.toMatchObject({ exitCode: 0 });
    await expect(run('a'.repeat(129))).resolves.toMatchObject({
      exitCode: 2,
      output: expect.stringContaining('Batch query id must contain 1 through 128 characters'),
    });
    expect(queryBatch).toHaveBeenCalledTimes(1);
  });

  it('rejects input over 1 MiB before parsing', async () => {
    const queryBatch = vi.fn();

    await expect(runBatchCommand({ name: 'batch' }, {
      cwd: () => '/workspace',
      readInput: async () => 'x'.repeat(1024 * 1024 + 1),
      queryBatch,
    })).resolves.toMatchObject({
      exitCode: 2,
      output: expect.stringContaining('Batch input exceeds 1048576 bytes'),
    });
    expect(queryBatch).not.toHaveBeenCalled();
  });
});
