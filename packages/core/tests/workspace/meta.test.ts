import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createDefaultCodeGraphyWorkspaceMeta,
  markCodeGraphyWorkspaceChangesPending,
  persistCodeGraphyWorkspaceIndexMetadata,
  readCodeGraphyWorkspaceMeta,
  type CodeGraphyWorkspaceMeta,
} from '../../src/workspace/meta';
import { getWorkspaceMetaPath } from '../../src/workspace/paths';

const tempDirectories: string[] = [];

function createTempWorkspace(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-workspace-meta-'));
  tempDirectories.push(workspaceRoot);
  return workspaceRoot;
}

function writeWorkspaceMetaFixture(
  workspaceRoot: string,
  meta: CodeGraphyWorkspaceMeta,
): void {
  const metaPath = getWorkspaceMetaPath(workspaceRoot);
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('workspace/meta', () => {
  it('returns defaults when workspace metadata is missing', () => {
    expect(readCodeGraphyWorkspaceMeta(createTempWorkspace())).toEqual(createDefaultCodeGraphyWorkspaceMeta());
  });

  it('writes and reads workspace metadata', () => {
    const workspaceRoot = createTempWorkspace();
    const meta = {
      version: 2 as const,
      lastIndexedAt: '2026-04-08T19:00:00.000Z',
      lastIndexedCommit: 'abc123',
      pluginSignature: 'codegraphy.markdown@1.0.0',
      pluginBuildSignature: 'plugin-build-sha',
      settingsSignature: 'settings-sha',
      analysisVersion: null,
      pendingChangedFiles: ['src/index.ts'],
      failedPluginIds: ['acme.failed'],
      filterAccounting: { kind: 'current' as const, excludedFileCount: 3, gitIgnoredPathCount: 2 },
    };

    writeWorkspaceMetaFixture(workspaceRoot, meta);

    expect(readCodeGraphyWorkspaceMeta(workspaceRoot)).toEqual(meta);
  });

  it('marks changed paths pending without dropping Core-owned metadata', async () => {
    const workspaceRoot = createTempWorkspace();
    const meta = {
      ...createDefaultCodeGraphyWorkspaceMeta(),
      analysisVersion: 'analysis-v2',
      failedPluginIds: ['acme.failed'],
      lastIndexedAt: '2026-04-08T19:00:00.000Z',
      lastIndexedCommit: 'abc123',
      pendingChangedFiles: ['src/existing.ts'],
      pluginBuildSignature: 'plugin-build-sha',
    };
    writeWorkspaceMetaFixture(workspaceRoot, meta);

    await markCodeGraphyWorkspaceChangesPending(workspaceRoot, [
      'src/existing.ts',
      'src/changed.ts',
    ]);

    expect(readCodeGraphyWorkspaceMeta(workspaceRoot)).toEqual({
      ...meta,
      pendingChangedFiles: ['src/existing.ts', 'src/changed.ts'],
    });
  });

  it('creates first-time metadata when the workspace still exists', async () => {
    const workspaceRoot = createTempWorkspace();

    await markCodeGraphyWorkspaceChangesPending(workspaceRoot, ['src/first.ts']);

    expect(readCodeGraphyWorkspaceMeta(workspaceRoot).pendingChangedFiles)
      .toEqual(['src/first.ts']);
  });

  it('does not recreate a workspace that was removed before a pending mark', async () => {
    const workspaceRoot = createTempWorkspace();
    fs.rmSync(workspaceRoot, { recursive: true });

    await markCodeGraphyWorkspaceChangesPending(workspaceRoot, ['src/late.ts']);

    expect(fs.existsSync(workspaceRoot)).toBe(false);
  });

  it('clears only resolved pending paths while preserving shared metadata fields', async () => {
    const workspaceRoot = createTempWorkspace();
    writeWorkspaceMetaFixture(workspaceRoot, {
      ...createDefaultCodeGraphyWorkspaceMeta(),
      failedPluginIds: ['acme.failed'],
      lastIndexedCommit: 'abc123',
      pendingChangedFiles: ['src/failed.ts', 'src/resolved.ts'],
    });

    await persistCodeGraphyWorkspaceIndexMetadata(workspaceRoot, {
      filterAccounting: { kind: 'current', excludedFileCount: 2, gitIgnoredPathCount: 1 },
      pluginSignature: 'plugins-sha',
      settingsSignature: 'settings-sha',
      resolvedChangedFilePaths: ['src/resolved.ts'],
    });

    expect(readCodeGraphyWorkspaceMeta(workspaceRoot)).toMatchObject({
      failedPluginIds: ['acme.failed'],
      lastIndexedCommit: 'abc123',
      pendingChangedFiles: ['src/failed.ts'],
    });
  });

  it('requires re-indexing when persisted metadata cannot provide current accounting', () => {
    const workspaceRoot = createTempWorkspace();
    const metaPath = getWorkspaceMetaPath(workspaceRoot);

    fs.mkdirSync(path.dirname(metaPath), { recursive: true });
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        version: 999,
        analysisVersion: null,
        lastIndexedAt: 42,
        pluginSignature: 'plugins-sha',
        settingsSignature: { sha: 'settings-sha' },
        pendingChangedFiles: ['src/app.ts', 7, 'src/index.ts'],
        failedPluginIds: ['acme.failed', 7],
      }, null, 2),
      'utf8',
    );

    expect(readCodeGraphyWorkspaceMeta(workspaceRoot)).toEqual(createDefaultCodeGraphyWorkspaceMeta());
  });

  it('falls back to defaults when metadata JSON is invalid', () => {
    const workspaceRoot = createTempWorkspace();
    const metaPath = getWorkspaceMetaPath(workspaceRoot);

    fs.mkdirSync(path.dirname(metaPath), { recursive: true });
    fs.writeFileSync(metaPath, '{bad json', 'utf8');

    expect(readCodeGraphyWorkspaceMeta(workspaceRoot)).toEqual(createDefaultCodeGraphyWorkspaceMeta());
  });
});
