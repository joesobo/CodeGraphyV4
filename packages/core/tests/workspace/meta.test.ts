import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createDefaultCodeGraphyWorkspaceMeta,
  readCodeGraphyWorkspaceMeta,
  writeCodeGraphyWorkspaceMeta,
} from '../../src/workspace/meta';
import { getWorkspaceMetaPath } from '../../src/workspace/paths';

const tempDirectories: string[] = [];

function createTempWorkspace(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-workspace-meta-'));
  tempDirectories.push(workspaceRoot);
  return workspaceRoot;
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
      version: 1 as const,
      lastIndexedAt: '2026-04-08T19:00:00.000Z',
      pluginSignature: 'codegraphy.markdown@1.0.0',
      settingsSignature: 'settings-sha',
      analysisVersion: null,
      pendingChangedFiles: ['src/index.ts'],
    };

    writeCodeGraphyWorkspaceMeta(workspaceRoot, meta);

    expect(readCodeGraphyWorkspaceMeta(workspaceRoot)).toEqual(meta);
  });

  it('filters invalid persisted metadata fields through the workspace meta schema', () => {
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
      }, null, 2),
      'utf8',
    );

    expect(readCodeGraphyWorkspaceMeta(workspaceRoot)).toEqual({
      ...createDefaultCodeGraphyWorkspaceMeta(),
      analysisVersion: null,
      pluginSignature: 'plugins-sha',
      pendingChangedFiles: ['src/app.ts', 'src/index.ts'],
      version: 1,
    });
  });

  it('falls back to defaults when metadata JSON is invalid', () => {
    const workspaceRoot = createTempWorkspace();
    const metaPath = getWorkspaceMetaPath(workspaceRoot);

    fs.mkdirSync(path.dirname(metaPath), { recursive: true });
    fs.writeFileSync(metaPath, '{bad json', 'utf8');

    expect(readCodeGraphyWorkspaceMeta(workspaceRoot)).toEqual(createDefaultCodeGraphyWorkspaceMeta());
  });
});
