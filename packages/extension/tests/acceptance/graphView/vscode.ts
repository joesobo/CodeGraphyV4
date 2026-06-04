import { expect, type Frame, type Page } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extensionRoot, repoRoot } from './workspace';
import type { VSCodeFixture } from './types';

export async function launchVSCodeWithWorkspace(workspacePath: string): Promise<VSCodeFixture> {
  const tempRoot = fs.mkdtempSync(
    path.join(selectVSCodeTempBaseDir(process.platform, os.tmpdir()), 'codegraphy-vscode-playwright-'),
  );
  const homePath = path.join(tempRoot, 'home');
  writeLocalPluginCache(homePath);
  const vscodeExecutablePath = await downloadAndUnzipVSCode({
    version: 'stable',
    cachePath: path.join(extensionRoot(), '.vscode-test'),
  });

  const { _electron } = await import('@playwright/test');
  const app = await _electron.launch({
    executablePath: vscodeExecutablePath,
    args: createVSCodeLaunchArgs({
      extensionPath: repoRoot(),
      extensionsPath: path.join(tempRoot, 'extensions'),
      platform: process.platform,
      userDataPath: path.join(tempRoot, 'user-data'),
      workspacePath,
    }),
    env: {
      ...process.env,
      HOME: homePath,
    },
  });

  const page = await app.firstWindow({ timeout: 90_000 });
  await page.waitForLoadState('domcontentloaded').catch(() => {});

  return { app, page, tempRoot };
}

function writeLocalPluginCache(homePath: string): void {
  const pluginPackageRoots = [
    'packages/plugin-typescript',
    'packages/plugin-godot',
    'packages/plugin-csharp',
    'packages/plugin-python',
    'packages/plugin-vue',
  ].map(packagePath => path.join(repoRoot(), packagePath));
  const plugins = pluginPackageRoots.flatMap((packageRoot) => {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
        codegraphy?: { apiVersion?: string; disclosures?: unknown[] };
        name?: string;
        version?: string;
      };
      const codegraphyJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'codegraphy.json'), 'utf8')) as {
        id?: string;
        name?: string;
        supportedExtensions?: string[];
      };
      if (!packageJson.name || !packageJson.version || !packageJson.codegraphy?.apiVersion) {
        return [];
      }

      return [{
        package: packageJson.name,
        version: packageJson.version,
        apiVersion: packageJson.codegraphy.apiVersion,
        disclosures: packageJson.codegraphy.disclosures ?? [],
        pluginId: codegraphyJson.id,
        pluginName: codegraphyJson.name,
        supportedExtensions: codegraphyJson.supportedExtensions ?? [],
        packageRoot,
      }];
    } catch {
      return [];
    }
  });

  const cachePath = path.join(homePath, '.codegraphy/plugins.json');
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify({ version: 1, plugins }, null, 2)}\n`);
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

export interface VSCodeLaunchArgsInput {
  extensionPath: string;
  extensionsPath: string;
  platform: NodeJS.Platform;
  userDataPath: string;
  workspacePath: string;
}

export function createVSCodeLaunchArgs(input: VSCodeLaunchArgsInput): string[] {
  return [
    input.workspacePath,
    `--extensionDevelopmentPath=${input.extensionPath}`,
    '--user-data-dir',
    input.userDataPath,
    '--extensions-dir',
    input.extensionsPath,
    '--use-inmemory-secretstorage',
    ...getMacOSMockKeychainArgs(input.platform),
    '--sync',
    'off',
    '--disable-telemetry',
    '--disable-updates',
    '--disable-workspace-trust',
    '--skip-welcome',
    '--skip-release-notes',
    '--disable-extensions',
    ...getLinuxSandboxArgs(input.platform),
  ];
}

export function selectVSCodeTempBaseDir(platform: NodeJS.Platform, fallbackTempDir: string): string {
  return platform === 'darwin' ? '/tmp' : fallbackTempDir;
}

function getLinuxSandboxArgs(platform: NodeJS.Platform): string[] {
  return platform === 'linux' ? ['--no-sandbox'] : [];
}

function getMacOSMockKeychainArgs(platform: NodeJS.Platform): string[] {
  return platform === 'darwin' ? ['--use-mock-keychain'] : [];
}
