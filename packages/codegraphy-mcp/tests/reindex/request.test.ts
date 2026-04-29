import { describe, expect, it, vi } from 'vitest';
import type { RepoStatusResult } from '../../src/repoStatus/model';
import { requestCodeGraphyReindex } from '../../src/reindex/request';

function createStatus(freshness: RepoStatusResult['freshness']): RepoStatusResult {
  return {
    workspaceRoot: '/workspace/project',
    databasePath: '/workspace/project/.codegraphy/graph.lbug',
    registered: true,
    status: freshness === 'fresh' ? 'indexed' : freshness,
    freshness,
    detail: freshness,
    lastIndexedAt: null,
    lastIndexedCommit: null,
    currentCommit: null,
    pendingChangedFiles: [],
    staleReasons: freshness === 'fresh' ? [] : ['commit-changed'],
  };
}

describe('reindex/request', () => {
  it('focuses VS Code, sends a repo-scoped reindex URI, and waits until fresh', async () => {
    const commands: Array<{ command: string; args: string[] }> = [];
    const sleep = vi.fn(async () => {});
    const statuses = [createStatus('stale'), createStatus('stale'), createStatus('fresh')];

    const result = await requestCodeGraphyReindex(
      { repoPath: '/workspace/project' },
      {
        platform: 'darwin',
        createRequestId: () => 'request-1',
        now: () => 0,
        sleep,
        readRepoStatus: () => statuses.shift() ?? createStatus('fresh'),
        runCommand: (command, args) => {
          commands.push({ command, args });
          return { status: 0 };
        },
      },
    );

    expect(result.status).toBe('fresh');
    expect(result.requestId).toBe('request-1');
    expect(commands).toEqual([
      { command: 'code', args: ['/workspace/project'] },
      {
        command: 'open',
        args: ['vscode://codegraphy.codegraphy/reindex?repo=%2Fworkspace%2Fproject&requestId=request-1'],
      },
    ]);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it('can request reindex without waiting for freshness', async () => {
    const sleep = vi.fn(async () => {});

    const result = await requestCodeGraphyReindex(
      { repoPath: '/workspace/project', wait: false },
      {
        platform: 'linux',
        createRequestId: () => 'request-2',
        now: () => 0,
        sleep,
        readRepoStatus: () => createStatus('stale'),
        runCommand: () => ({ status: 0 }),
      },
    );

    expect(result.status).toBe('requested');
    expect(result.waited).toBe(false);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('reports a timeout when the index never becomes fresh', async () => {
    const timestamps = [0, 0, 1, 2, 3];

    const result = await requestCodeGraphyReindex(
      { repoPath: '/workspace/project', timeoutMs: 2, pollIntervalMs: 1 },
      {
        platform: 'darwin',
        createRequestId: () => 'request-3',
        now: () => timestamps.shift() ?? 3,
        sleep: async () => {},
        readRepoStatus: () => createStatus('stale'),
        runCommand: () => ({ status: 0 }),
      },
    );

    expect(result.status).toBe('timed-out');
    expect(result.after.freshness).toBe('stale');
    expect(result.limitations).toContain('Timed out waiting for CodeGraphy index freshness.');
  });

  it('reports a failed request when the code command cannot focus the repo', async () => {
    const result = await requestCodeGraphyReindex(
      { repoPath: '/workspace/project' },
      {
        platform: 'darwin',
        createRequestId: () => 'request-4',
        now: () => 0,
        sleep: async () => {},
        readRepoStatus: () => createStatus('stale'),
        runCommand: () => ({ status: 1, stderr: 'code missing' }),
      },
    );

    expect(result.status).toBe('failed');
    expect(result.limitations).toEqual([
      '`code /workspace/project` failed: code missing',
    ]);
  });
});
