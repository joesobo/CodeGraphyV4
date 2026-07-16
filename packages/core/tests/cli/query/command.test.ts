import { describe, expect, it } from 'vitest';
import { runQueryCommand } from '../../../src/cli/query/command';

describe('cli/query/command', () => {
  it('rejects workspace selectors that escape the workspace', async () => {
    await expect(runQueryCommand({
      name: 'query',
      report: 'edges',
      arguments: { from: '../outside.ts' },
    }, {
      cwd: () => '/workspace',
      query: async () => ({}),
    })).resolves.toEqual({
      exitCode: 2,
      output: '{"error":"invalid_arguments","message":"Query path is outside the workspace: ../outside.ts"}',
    });
  });

  it('lets operational query failures reach the CLI runtime', async () => {
    await expect(runQueryCommand({
      name: 'query',
      report: 'edges',
      arguments: {},
    }, {
      cwd: () => '/workspace',
      query: async () => {
        throw new Error('database unavailable');
      },
    })).rejects.toThrow('database unavailable');
  });
});
