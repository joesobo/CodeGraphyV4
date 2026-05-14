import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createCodeGraphyWorkspaceSettingsSignature,
  getWorkspaceSettingsPath,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyWorkspaceSettings,
} from '../../src';

async function createWorkspace(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-settings-'));
}

describe('CodeGraphy Workspace settings', () => {
  it('normalizes workspace plugin entries from settings.json', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.mkdir(path.dirname(getWorkspaceSettingsPath(workspaceRoot)), { recursive: true });
    await fs.writeFile(
      getWorkspaceSettingsPath(workspaceRoot),
      JSON.stringify({
        maxFiles: 50,
        plugins: [
          {
            package: '@codegraphy/plugin-python',
            disabledFilterPatterns: ['**/__pycache__/**', 42],
            options: { includeTests: true },
          },
          { package: '' },
          { name: '@codegraphy/plugin-legacy' },
        ],
      }),
      'utf-8',
    );

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot)).toMatchObject({
      maxFiles: 50,
      plugins: [{
        package: '@codegraphy/plugin-python',
        disabledFilterPatterns: ['**/__pycache__/**'],
        options: { includeTests: true },
      }],
    });
  });

  it('writes plugin array order into the settings signature', async () => {
    const workspaceRoot = await createWorkspace();
    const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);

    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      plugins: [
        { package: '@codegraphy/plugin-markdown' },
        { package: '@codegraphy/plugin-python' },
      ],
    });

    const firstSignature = createCodeGraphyWorkspaceSettingsSignature(
      readCodeGraphyWorkspaceSettings(workspaceRoot),
    );
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      plugins: [
        { package: '@codegraphy/plugin-python' },
        { package: '@codegraphy/plugin-markdown' },
      ],
    });

    expect(createCodeGraphyWorkspaceSettingsSignature(
      readCodeGraphyWorkspaceSettings(workspaceRoot),
    )).not.toBe(firstSignature);
  });
});
