import { describe, expect, it, vi } from 'vitest';
import { refreshChurnIndex } from '../../../src/extension/churn/refresh';

describe('refreshChurnIndex', () => {
  it('reuses counts while repository HEAD is unchanged', async () => {
    const values = new Map<string, unknown>();
    const workspaceState = {
      get: <T>(key: string): T | undefined => values.get(key) as T | undefined,
      update: vi.fn(async (key: string, value: unknown) => {
        values.set(key, value);
      }),
    };
    const runGit = vi.fn(async (args: readonly string[]) => {
      if (args[0] === 'rev-parse' && args[1] === 'HEAD') return 'abc123\n';
      if (args[0] === 'rev-parse') return '';
      return '__CODEGRAPHY_COMMIT__\nM\tsrc/app.ts\n';
    });
    const options = {
      filePaths: ['src/app.ts'],
      runGit,
      workspaceRoot: '/repo',
      workspaceState,
    };

    await expect(refreshChurnIndex(options)).resolves.toEqual({ 'src/app.ts': 1 });
    await expect(refreshChurnIndex(options)).resolves.toEqual({ 'src/app.ts': 1 });

    expect(runGit.mock.calls.filter(([args]) => args[0] === 'log')).toHaveLength(1);
  });

  it('returns empty counts outside a Git repository', async () => {
    await expect(refreshChurnIndex({
      filePaths: ['src/app.ts'],
      runGit: vi.fn(async () => { throw new Error('not a git repository'); }),
      workspaceRoot: '/repo',
      workspaceState: { get: () => undefined, update: vi.fn(async () => undefined) },
    })).resolves.toEqual({});
  });
});
