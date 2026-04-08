import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createDefaultCodeGraphyRepoMeta,
  getCodeGraphyRepoMetaPath,
  readCodeGraphyRepoMeta,
  writeCodeGraphyRepoMeta,
} from '../../../src/extension/repoSettings/meta';

function createTempWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-repo-meta-'));
}

describe('extension/repoSettings/meta', () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('returns defaults when .codegraphy/meta.json is missing', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);

    expect(readCodeGraphyRepoMeta(workspaceRoot)).toEqual(createDefaultCodeGraphyRepoMeta());
  });

  it('writes and reads .codegraphy/meta.json', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const meta = {
      version: 1 as const,
      lastIndexedAt: '2026-04-08T19:00:00.000Z',
      lastIndexedCommit: 'abc123',
      pluginSignature: 'codegraphy.markdown@1.0.0',
      settingsSignature: 'settings-sha',
    };

    writeCodeGraphyRepoMeta(workspaceRoot, meta);

    expect(fs.existsSync(getCodeGraphyRepoMetaPath(workspaceRoot))).toBe(true);
    expect(readCodeGraphyRepoMeta(workspaceRoot)).toEqual(meta);
  });

  it('falls back to defaults when meta.json is invalid', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const metaPath = getCodeGraphyRepoMetaPath(workspaceRoot);

    fs.mkdirSync(path.dirname(metaPath), { recursive: true });
    fs.writeFileSync(metaPath, '{bad json', 'utf8');

    expect(readCodeGraphyRepoMeta(workspaceRoot)).toEqual(createDefaultCodeGraphyRepoMeta());
  });

  it('skips writes when the workspace root does not exist', () => {
    const workspaceRoot = path.join(os.tmpdir(), 'codegraphy-missing-workspace');
    const meta = {
      version: 1 as const,
      lastIndexedAt: '2026-04-08T19:00:00.000Z',
      lastIndexedCommit: 'abc123',
      pluginSignature: 'codegraphy.markdown@1.0.0',
      settingsSignature: 'settings-sha',
    };

    writeCodeGraphyRepoMeta(workspaceRoot, meta);

    expect(fs.existsSync(getCodeGraphyRepoMetaPath(workspaceRoot))).toBe(false);
  });
});
