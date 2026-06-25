import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateCodeGraphyIndexStatus } from '../../../../src/extension/repoSettings/freshness';
import type { ICodeGraphyRepoMeta } from '../../../../src/extension/repoSettings/meta';

const indexedMeta: ICodeGraphyRepoMeta = {
  version: 1,
  lastIndexedAt: '2026-04-27T12:00:00.000Z',
  lastIndexedCommit: 'abc123',
  pluginSignature: 'plugins',
  settingsSignature: 'settings',
  pendingChangedFiles: [],
};

describe('repoSettings/freshness/index', () => {
  it('reports a fresh index when signatures and commit still match', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: indexedMeta,
      currentCommit: 'abc123',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toMatchObject({
      freshness: 'fresh',
      hasIndex: true,
      staleReasons: [],
    });
  });

  it('reports a missing index when the workspace has never been indexed', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: {
        ...indexedMeta,
        lastIndexedAt: null,
      },
      currentCommit: 'abc123',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toMatchObject({
      freshness: 'missing',
      hasIndex: false,
      staleReasons: ['never-indexed'],
      detail: 'CodeGraphy index is missing. Index the workspace to build the graph.',
    });
  });

  it('reports a stale index when pending changed files exist', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: {
        ...indexedMeta,
        pendingChangedFiles: ['src/types.ts'],
      },
      currentCommit: 'abc123',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toMatchObject({
      freshness: 'stale',
      hasIndex: false,
      staleReasons: ['pending-changed-files'],
      detail: 'CodeGraphy index is stale: 1 pending changed file.',
    });
  });

  it('ignores generated pending changed files when evaluating index freshness', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: {
        ...indexedMeta,
        pendingChangedFiles: [
          '/workspace/packages/plugin-typescript/.turbo',
          '/workspace/.worktrees/speed-up-codegraphy/packages/extension/src/extension.ts',
        ],
      },
      currentCommit: 'abc123',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toMatchObject({
      freshness: 'fresh',
      hasIndex: true,
      staleReasons: [],
    });
  });

  it('ignores pending changed files already covered by index metadata', () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-index-freshness-'));
    const filePath = path.join(workspaceRoot, 'src/types.ts');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'export type Example = string;\n');

    try {
      expect(evaluateCodeGraphyIndexStatus({
        meta: {
          ...indexedMeta,
          lastIndexedAt: new Date(Date.now() + 1_000).toISOString(),
          pendingChangedFiles: [filePath],
        },
        currentCommit: 'abc123',
        pluginSignature: 'plugins',
        settingsSignature: 'settings',
      })).toMatchObject({
        freshness: 'fresh',
        hasIndex: true,
        staleReasons: [],
      });
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  it('describes plural pending changed files', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: {
        ...indexedMeta,
        pendingChangedFiles: ['src/types.ts', 'src/graph.ts'],
      },
      currentCommit: 'abc123',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    }).detail).toBe('CodeGraphy index is stale: 2 pending changed files.');
  });

  it('reports a stale index when the current commit changed', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: {
        ...indexedMeta,
        lastIndexedCommit: 'old-commit',
      },
      currentCommit: 'new-commit',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toMatchObject({
      freshness: 'stale',
      hasIndex: false,
      staleReasons: ['commit-changed'],
      detail: 'CodeGraphy index is stale: the workspace commit changed since the last index.',
    });
  });

  it('reports stale plugin and settings signatures in priority order', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: indexedMeta,
      currentCommit: 'abc123',
      pluginSignature: 'new-plugins',
      settingsSignature: 'new-settings',
    })).toMatchObject({
      freshness: 'stale',
      staleReasons: ['plugin-signature-changed', 'settings-signature-changed'],
      detail: 'CodeGraphy index is stale: installed CodeGraphy plugins changed.',
    });
  });

  it('reports stale settings when only the settings signature changed', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: indexedMeta,
      currentCommit: 'abc123',
      pluginSignature: 'plugins',
      settingsSignature: 'new-settings',
    })).toMatchObject({
      freshness: 'stale',
      staleReasons: ['settings-signature-changed'],
      detail: 'CodeGraphy index is stale: CodeGraphy settings changed.',
    });
  });

  it('reports missing indexed commit when a workspace now has a commit', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: {
        ...indexedMeta,
        lastIndexedCommit: null,
      },
      currentCommit: 'abc123',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toMatchObject({
      freshness: 'stale',
      staleReasons: ['missing-indexed-commit'],
      detail: 'CodeGraphy index is stale: the workspace now has a commit, but the saved index does not.',
    });
  });

  it('reports current commit unavailable when the indexed commit cannot be compared', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: indexedMeta,
      currentCommit: null,
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toMatchObject({
      freshness: 'stale',
      staleReasons: ['current-commit-unavailable'],
      detail: 'CodeGraphy index is stale: the current workspace commit could not be resolved.',
    });
  });

  it('stays fresh for uncommitted repos after they have been indexed', () => {
    expect(evaluateCodeGraphyIndexStatus({
      meta: {
        ...indexedMeta,
        lastIndexedCommit: null,
      },
      currentCommit: null,
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
    })).toMatchObject({
      freshness: 'fresh',
      staleReasons: [],
    });
  });
});
