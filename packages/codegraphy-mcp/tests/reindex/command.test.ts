import { describe, expect, it } from 'vitest';
import type { ReindexRequestResult } from '../../src/reindex/request';
import { runReindexCommand } from '../../src/reindex/command';

function createResult(status: ReindexRequestResult['status']): ReindexRequestResult {
  return {
    repo: '/workspace/project',
    requestId: 'request-1',
    uri: 'vscode://codegraphy.codegraphy/reindex?repo=%2Fworkspace%2Fproject&requestId=request-1',
    status,
    waited: true,
    timeoutMs: 600000,
    pollIntervalMs: 1000,
    before: {
      workspaceRoot: '/workspace/project',
      databasePath: '/workspace/project/.codegraphy/graph.lbug',
      registered: true,
      status: 'stale',
      freshness: 'stale',
      detail: 'stale',
      lastIndexedAt: null,
      lastIndexedCommit: null,
      currentCommit: null,
      pendingChangedFiles: [],
      staleReasons: ['commit-changed'],
    },
    after: {
      workspaceRoot: '/workspace/project',
      databasePath: '/workspace/project/.codegraphy/graph.lbug',
      registered: true,
      status: status === 'fresh' ? 'indexed' : 'stale',
      freshness: status === 'fresh' ? 'fresh' : 'stale',
      detail: status,
      lastIndexedAt: null,
      lastIndexedCommit: null,
      currentCommit: null,
      pendingChangedFiles: [],
      staleReasons: status === 'fresh' ? [] : ['commit-changed'],
    },
    limitations: [],
  };
}

describe('reindex/command', () => {
  it('prints successful reindex request details', async () => {
    const result = await runReindexCommand('/workspace/project', {
      requestCodeGraphyReindex: async () => createResult('fresh'),
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('status: fresh');
    expect(result.output).toContain('repo: /workspace/project');
    expect(result.output).toContain('requestId: request-1');
  });

  it('exits non-zero when reindex times out', async () => {
    const result = await runReindexCommand('/workspace/project', {
      requestCodeGraphyReindex: async () => createResult('timed-out'),
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('status: timed-out');
  });
});
