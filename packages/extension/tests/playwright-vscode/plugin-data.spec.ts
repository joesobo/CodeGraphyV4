import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  copyExampleTypescriptWorkspace,
  createWorkspaceTempRoot,
  repoRoot,
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

  test('shows workspace custom particle effects in the Particles section on launch', async () => {
    const workspaceTempRoot = createWorkspaceTempRoot();
    const workspacePath = copyExampleTypescriptWorkspace(workspaceTempRoot, {
      pluginPackages: ['@codegraphy-dev/plugin-particles'],
    });
    writeFirefliesParticleEffect(workspacePath);
    writeParticlePluginSettings(workspacePath, {
      enabled: true,
      preset: 'custom',
      customEffectId: 'fireflies',
    });

    const vscode = await launchVSCodeWithWorkspace(workspacePath, {
      pluginPackageRelativePaths: ['packages/plugin-typescript', 'packages/plugin-particles'],
    });

    try {
      await openGraphView(vscode.page);
      const frame = await waitForGraphFrame(vscode.page);

      await frame.getByTitle('Themes').click();

      await expect(frame.getByRole('button', { name: /^Particles$/i })).toBeVisible();
      await expect(frame.getByRole('switch', { name: 'Toggle Fireflies custom background effect' }))
        .toHaveAttribute('data-state', 'checked');
    } finally {
      await vscode.app.close().catch(() => {});
      fs.rmSync(vscode.tempRoot, { recursive: true, force: true });
      fs.rmSync(workspaceTempRoot, { recursive: true, force: true });
    }
  });
});

interface ParticlePluginData {
  enabled: boolean;
  preset: string;
  customEffectId?: string;
}

function writeParticlePluginSettings(
  workspacePath: string,
  pluginData: ParticlePluginData = {
    enabled: true,
    preset: 'embers',
  },
): void {
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
    'codegraphy.particles': pluginData,
  };

  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

function writeFirefliesParticleEffect(workspacePath: string): void {
  const effectsDir = path.join(workspacePath, '.codegraphy', 'particles');
  fs.mkdirSync(effectsDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot(), 'examples', '.codegraphy', 'particles', 'fireflies.ts'),
    path.join(effectsDir, 'fireflies.ts'),
  );
}
