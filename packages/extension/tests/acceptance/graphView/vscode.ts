import { expect, type Frame, type Page } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extensionRoot, repoRoot } from './workspace';
import type { VSCodeFixture } from './types';

export async function launchVSCodeWithWorkspace(workspacePath: string): Promise<VSCodeFixture> {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-vscode-playwright-'));
  const vscodeExecutablePath = await downloadAndUnzipVSCode({
    version: 'stable',
    cachePath: path.join(extensionRoot(), '.vscode-test'),
  });

  const { _electron } = await import('@playwright/test');
  const app = await _electron.launch({
    executablePath: vscodeExecutablePath,
    args: [
      workspacePath,
      `--extensionDevelopmentPath=${repoRoot()}`,
      '--user-data-dir',
      path.join(tempRoot, 'user-data'),
      '--extensions-dir',
      path.join(tempRoot, 'extensions'),
      '--use-inmemory-secretstorage',
      '--sync',
      'off',
      '--disable-telemetry',
      '--disable-updates',
      '--disable-workspace-trust',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-extensions',
      ...getLinuxSandboxArgs(),
    ],
    env: {
      ...process.env,
      HOME: path.join(tempRoot, 'home'),
    },
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded').catch(() => {});

  return { app, page, tempRoot };
}

export async function openGraphView(page: Page): Promise<void> {
  const commandPaletteShortcut = process.platform === 'darwin' ? 'Meta+Shift+P' : 'Control+Shift+P';

  await page.bringToFront();
  await expect.poll(() => page.title(), { timeout: 15_000 }).toContain('[Extension Development Host]');
  await page.mouse.click(640, 450);
  await page.keyboard.press(commandPaletteShortcut);
  await page.keyboard.type('CodeGraphy: Open');
  await expect(page.getByText('CodeGraphy: Open', { exact: true }).first()).toBeVisible();
  await page.keyboard.press('Enter');
}

export async function waitForGraphFrame(page: Page): Promise<Frame> {
  await expect.poll(async () => {
    for (const frame of page.frames().filter(candidate => candidate.url().includes('fake.html'))) {
      const graphStageCount = await frame.getByLabel('Graph Stage').count().catch(() => 0);
      if (graphStageCount > 0) {
        return true;
      }
    }

    return false;
  }, { timeout: 15_000 }).toBe(true);

  for (const frame of page.frames().filter(candidate => candidate.url().includes('fake.html'))) {
    const graphStageCount = await frame.getByLabel('Graph Stage').count().catch(() => 0);
    if (graphStageCount > 0) {
      return frame;
    }
  }

  throw new Error('Expected the Graph View webview frame to contain Graph Stage');
}

export async function cleanupVSCode({ app, tempRoot }: VSCodeFixture): Promise<void> {
  await app.close().catch(() => {});
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function getLinuxSandboxArgs(): string[] {
  return process.platform === 'linux' ? ['--no-sandbox'] : [];
}
