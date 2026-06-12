import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  copyExampleTypescriptWorkspace,
  createWorkspaceTempRoot,
} from '../acceptance/graphView/workspace';
import {
  launchVSCodeWithWorkspace,
  openGraphView,
  waitForGraphFrame,
} from '../acceptance/graphView/vscode';

test.describe('plugin data startup', () => {
  test('restores saved particle plugin data when an enabled plugin activates on launch', async () => {
    const workspaceTempRoot = createWorkspaceTempRoot();
    const workspacePath = copyExampleTypescriptWorkspace(workspaceTempRoot, {
      pluginPackages: ['@codegraphy-dev/plugin-particles'],
    });
    writeParticlePluginSettings(workspacePath);

    const vscode = await launchVSCodeWithWorkspace(workspacePath, {
      pluginPackageRelativePaths: ['packages/plugin-typescript', 'packages/plugin-particles'],
    });

    try {
      await openGraphView(vscode.page);
      const frame = await waitForGraphFrame(vscode.page);

      await frame.getByTitle('Themes').click();

      await expect(frame.getByRole('button', { name: /^Particles$/i })).toBeVisible();
      await expect(frame.getByRole('switch', { name: 'Toggle Embers background effect' }))
        .toHaveAttribute('data-state', 'checked');
    } finally {
      await vscode.app.close().catch(() => {});
      fs.rmSync(vscode.tempRoot, { recursive: true, force: true });
      fs.rmSync(workspaceTempRoot, { recursive: true, force: true });
    }
  });
});

function writeParticlePluginSettings(workspacePath: string): void {
  const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Record<string, unknown>;

  settings.plugins = [
    {
      id: 'codegraphy.typescript',
      enabled: true,
    },
    {
      id: 'codegraphy.particles',
      enabled: true,
    },
  ];
  settings.pluginData = {
    'codegraphy.particles': {
      enabled: true,
      preset: 'embers',
    },
  };

  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}
