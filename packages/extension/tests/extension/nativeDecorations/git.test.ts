import { describe, expect, it, vi } from 'vitest';
import { collectGitStatuses, parseGitPorcelain } from '../../../src/extension/nativeDecorations/git';

describe('nativeDecorations/git', () => {
  it('collects repository changes from the built-in Git extension API', async () => {
    const activate = vi.fn(async () => ({
      getAPI: () => ({
        repositories: [{
          state: {
            mergeChanges: [],
            indexChanges: [{ uri: { fsPath: '/workspace/src/new.ts' }, status: 1 }],
            workingTreeChanges: [{ uri: { fsPath: '/workspace/src/app.ts' }, status: 5 }],
          },
        }],
      }),
    }));

    await expect(collectGitStatuses({
      workspaceRoots: ['/workspace'],
      getGitExtension: () => ({ isActive: false, activate }),
      execGitStatus: vi.fn(),
    })).resolves.toEqual(new Map([
      ['/workspace/src/new.ts', 'added'],
      ['/workspace/src/app.ts', 'modified'],
    ]));
  });

  it('falls back to porcelain status when the built-in Git API is unavailable', async () => {
    const execGitStatus = vi.fn(async () => ' M src/app.ts\0?? src/new.ts\0');

    await expect(collectGitStatuses({
      workspaceRoots: ['/workspace'],
      getGitExtension: () => undefined,
      execGitStatus,
    })).resolves.toEqual(new Map([
      ['/workspace/src/app.ts', 'modified'],
      ['/workspace/src/new.ts', 'untracked'],
    ]));
    expect(execGitStatus).toHaveBeenCalledWith('/workspace');
  });

  it('parses rename records without decorating the former path', () => {
    expect(parseGitPorcelain('R  src/new.ts\0src/old.ts\0', '/workspace')).toEqual(new Map([
      ['/workspace/src/new.ts', 'renamed'],
    ]));
  });
});
