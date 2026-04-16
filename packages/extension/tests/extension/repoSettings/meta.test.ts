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

  it('returns fresh default metadata values on each call', () => {
    const first = createDefaultCodeGraphyRepoMeta();
    const second = createDefaultCodeGraphyRepoMeta();

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.pendingChangedFiles).not.toBe(first.pendingChangedFiles);
  });

  it('builds the meta path inside the repo-local .codegraphy directory', () => {
    expect(getCodeGraphyRepoMetaPath('/workspace/project')).toBe(
      path.join('/workspace/project', '.codegraphy', 'meta.json'),
    );
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
      pendingChangedFiles: ['src/index.ts'],
    };

    writeCodeGraphyRepoMeta(workspaceRoot, meta);
    writeCodeGraphyRepoMeta(workspaceRoot, meta);

    expect(fs.existsSync(getCodeGraphyRepoMetaPath(workspaceRoot))).toBe(true);
    expect(fs.readFileSync(getCodeGraphyRepoMetaPath(workspaceRoot), 'utf8')).toBe(
      `${JSON.stringify(meta, null, 2)}\n`,
    );
    expect(readCodeGraphyRepoMeta(workspaceRoot)).toEqual(meta);
  });

  it('merges partial persisted meta with the default fields', () => {
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    const metaPath = getCodeGraphyRepoMetaPath(workspaceRoot);

    fs.mkdirSync(path.dirname(metaPath), { recursive: true });
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        lastIndexedCommit: 'abc123',
        pendingChangedFiles: ['src/app.ts'],
      }, null, 2),
      'utf8',
    );

    expect(readCodeGraphyRepoMeta(workspaceRoot)).toEqual({
      version: 1,
      lastIndexedAt: null,
      lastIndexedCommit: 'abc123',
      pluginSignature: null,
      settingsSignature: null,
      pendingChangedFiles: ['src/app.ts'],
    });
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
    const workspaceRoot = createTempWorkspace();
    tempDirectories.push(workspaceRoot);
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
    const meta = {
      version: 1 as const,
      lastIndexedAt: '2026-04-08T19:00:00.000Z',
      lastIndexedCommit: 'abc123',
      pluginSignature: 'codegraphy.markdown@1.0.0',
      settingsSignature: 'settings-sha',
      pendingChangedFiles: ['src/index.ts'],
    };

    expect(fs.existsSync(workspaceRoot)).toBe(false);
    writeCodeGraphyRepoMeta(workspaceRoot, meta);

    expect(fs.existsSync(getCodeGraphyRepoMetaPath(workspaceRoot))).toBe(false);
  });
});
