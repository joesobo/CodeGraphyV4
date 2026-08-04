import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { withWorkspaceAnalysisDatabaseWriter } from '../../src/graphCache/database/storage';
import {
  createDefaultCodeGraphyWorkspaceMeta,
  markCodeGraphyWorkspaceChangesPending,
  persistCodeGraphyWorkspaceIndexMetadata,
  readCodeGraphyWorkspaceMeta,
  writeCodeGraphyWorkspaceMeta,
} from '../../src/workspace/meta';

const tempDirectories: string[] = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('workspace metadata concurrency', () => {
  it('does not let an unrelated metadata commit erase a concurrently marked pending path', async () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-meta-race-'));
    tempDirectories.push(workspaceRoot);
    writeCodeGraphyWorkspaceMeta(workspaceRoot, {
      ...createDefaultCodeGraphyWorkspaceMeta(),
      pendingChangedFiles: ['src/resolved.ts'],
    });
    let allowOwnedCommit: (() => void) | undefined;
    const ownedCommitGate = new Promise<void>(resolve => {
      allowOwnedCommit = resolve;
    });
    let reportOwnership: (() => void) | undefined;
    const ownershipAcquired = new Promise<void>(resolve => {
      reportOwnership = resolve;
    });
    const ownedCommit = withWorkspaceAnalysisDatabaseWriter(workspaceRoot, async () => {
      reportOwnership?.();
      await ownedCommitGate;
      await persistCodeGraphyWorkspaceIndexMetadata(workspaceRoot, {
        pluginSignature: 'plugins-sha',
        settingsSignature: 'settings-sha',
        resolvedChangedFilePaths: ['src/resolved.ts'],
      });
    });
    await ownershipAcquired;

    let pendingMarkSettled = false;
    const pendingMark = markCodeGraphyWorkspaceChangesPending(
      workspaceRoot,
      ['src/pending.ts'],
    ).then(() => {
      pendingMarkSettled = true;
    });
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(pendingMarkSettled).toBe(false);

    allowOwnedCommit?.();
    await Promise.all([ownedCommit, pendingMark]);

    expect(readCodeGraphyWorkspaceMeta(workspaceRoot).pendingChangedFiles)
      .toEqual(['src/pending.ts']);
  });
});
