import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IPlugin } from '@codegraphy/plugin-api';
import { describe, expect, it } from 'vitest';

import {
  indexCodeGraphyWorkspace,
  readCodeGraphyWorkspaceSettings,
  readCodeGraphyWorkspaceStatus,
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
  apiVersion: '^2.0.0',
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
      showOrphans: true,
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
      plugins: [{ package: '@codegraphy/plugin-python' }],
    });

    expect(readCodeGraphyWorkspaceStatus(workspaceRoot, {
      plugins: [textPlugin],
    })).toMatchObject({
      state: 'stale',
      hasGraphCache: true,
      staleReasons: ['settings-signature-changed'],
    });
  });
});
