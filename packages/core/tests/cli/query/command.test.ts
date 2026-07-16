import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runQueryCommand } from '../../../src/cli/query/command';

describe('cli/query/command', () => {
  it('normalizes absolute symbol IDs across canonical workspace path aliases', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-path-'));
    const filePath = path.join(workspaceRoot, 'entry.ts');
    await fs.writeFile(filePath, 'export function target(): void {}\n');
    const canonicalWorkspaceRoot = await fs.realpath(workspaceRoot);
    let receivedInput: unknown;

    await expect(runQueryCommand({
      name: 'query',
      report: 'edges',
      workspacePath: canonicalWorkspaceRoot,
      arguments: { from: `${filePath}#target:function` },
    }, {
      cwd: () => canonicalWorkspaceRoot,
      query: async (input) => {
        receivedInput = input;
        return {};
      },
    })).resolves.toMatchObject({ exitCode: 0 });

    expect(receivedInput).toMatchObject({
      arguments: { from: 'entry.ts#target:function' },
    });
  });

  it('accepts an in-workspace path whose segment starts with two dots', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-segment-'));
    const selector = path.join(workspaceRoot, '..cache', 'entry.ts');
    await fs.mkdir(path.dirname(selector));
    await fs.writeFile(selector, 'export const value = 1;\n');
    let receivedInput: unknown;

    await expect(runQueryCommand({
      name: 'query',
      report: 'edges',
      workspacePath: workspaceRoot,
      arguments: { from: selector },
    }, {
      cwd: () => workspaceRoot,
      query: async (input) => {
        receivedInput = input;
        return {};
      },
    })).resolves.toMatchObject({ exitCode: 0 });

    expect(receivedInput).toMatchObject({ arguments: { from: '..cache/entry.ts' } });
  });

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
