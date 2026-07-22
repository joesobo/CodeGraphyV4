import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it } from 'vitest';

import {
  indexCodeGraphyWorkspace,
  readCodeGraphyWorkspaceMeta,
  readCodeGraphyWorkspaceSettings,
  readCodeGraphyWorkspaceStatus,
  writeCodeGraphyWorkspaceMeta,
  writeCodeGraphyWorkspaceSettings,
} from '../../src';

async function createWorkspace(): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-status-'));
  await fs.writeFile(path.join(workspaceRoot, 'source.txt'), 'content\n', 'utf-8');
  return workspaceRoot;
}

const textPlugin: IPlugin = {
  id: 'codegraphy.test-text',
  name: 'Test Text',
  version: '1.0.0',
  apiVersion: '^4.0.0',
  supportedExtensions: ['.txt'],
  async analyzeFile(filePath) {
    return { filePath, relations: [] };
  },
};

describe('CodeGraphy Workspace status', () => {
  it('reports missing, fresh, then stale after workspace settings change', async () => {
    const workspaceRoot = await createWorkspace();

    expect(readCodeGraphyWorkspaceStatus(workspaceRoot)).toMatchObject({
      state: 'missing',
      hasGraphCache: false,
      staleReasons: ['never-indexed'],
    });

    await indexCodeGraphyWorkspace({
      workspaceRoot,
      includeCorePlugins: false,
      plugins: [textPlugin],
    });

    expect(readCodeGraphyWorkspaceStatus(workspaceRoot, {
      plugins: [textPlugin],
    })).toMatchObject({
      state: 'fresh',
      hasGraphCache: true,
      staleReasons: [],
    });

    const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      plugins: [{ id: 'codegraphy.vue', activation: 'enabled' }],
    });

    expect(readCodeGraphyWorkspaceStatus(workspaceRoot, {
      plugins: [textPlugin],
    })).toMatchObject({
      state: 'stale',
      hasGraphCache: true,
      staleReasons: ['settings-signature-changed'],
    });
  });

  it('accepts adapter-provided signatures for callers with their own settings model', async () => {
    const workspaceRoot = await createWorkspace();
    await indexCodeGraphyWorkspace({
      workspaceRoot,
      includeCorePlugins: false,
      plugins: [textPlugin],
    });
    const meta = readCodeGraphyWorkspaceMeta(workspaceRoot);

    expect(readCodeGraphyWorkspaceStatus(workspaceRoot, {
      pluginSignature: meta.pluginSignature,
      settingsSignature: meta.settingsSignature ?? '',
    })).toMatchObject({
      state: 'fresh',
      staleReasons: [],
    });

    expect(readCodeGraphyWorkspaceStatus(workspaceRoot, {
      pluginSignature: 'legacy-adapter-plugin@1.0.0',
      settingsSignature: meta.settingsSignature ?? '',
    })).toMatchObject({
      state: 'stale',
      staleReasons: ['plugin-signature-changed'],
    });
  });

  it('does not mark the Graph Cache stale for generated pending refresh paths', async () => {
    const workspaceRoot = await createWorkspace();
    await indexCodeGraphyWorkspace({
      workspaceRoot,
      includeCorePlugins: false,
      plugins: [textPlugin],
    });
    const meta = readCodeGraphyWorkspaceMeta(workspaceRoot);
    writeCodeGraphyWorkspaceMeta(workspaceRoot, {
      ...meta,
      pendingChangedFiles: [
        path.join(workspaceRoot, 'packages/plugin-typescript/.turbo'),
        path.join(workspaceRoot, '.worktrees/speed-up-codegraphy/packages/core/src/index.ts'),
      ],
    });

    expect(readCodeGraphyWorkspaceStatus(workspaceRoot, {
      plugins: [textPlugin],
    })).toMatchObject({
      state: 'fresh',
      staleReasons: [],
    });
  });

  it('does not mark the Graph Cache stale for pending files already covered by the last index', async () => {
    const workspaceRoot = await createWorkspace();
    await indexCodeGraphyWorkspace({
      workspaceRoot,
      includeCorePlugins: false,
      plugins: [textPlugin],
    });
    const meta = readCodeGraphyWorkspaceMeta(workspaceRoot);
    writeCodeGraphyWorkspaceMeta(workspaceRoot, {
      ...meta,
      pendingChangedFiles: [
        path.join(workspaceRoot, 'source.txt'),
      ],
    });

    expect(readCodeGraphyWorkspaceStatus(workspaceRoot, {
      plugins: [textPlugin],
    })).toMatchObject({
      state: 'fresh',
      staleReasons: [],
    });
  });
});
