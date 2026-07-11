import { expect, type Frame, type Page } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeAcceptanceInstalledPluginCache } from './plugins';
import { extensionRoot, repoRoot } from './workspace';
import type { VSCodeFixture } from './types';

export const VSCODE_PLAYWRIGHT_WAIT_TIMEOUT_MS = 20_000;
export const OPEN_GRAPH_VIEW_COMMAND_PALETTE_ATTEMPTS = 3;
export const VSCODE_TEST_VERSION = process.env.CODEGRAPHY_VSCODE_TEST_VERSION ?? 'stable';

interface LaunchVSCodeWithWorkspaceOptions {
  readonly pluginPackageRelativePaths?: readonly string[];
  readonly profileRoot?: string;
}

export async function launchVSCodeWithWorkspace(
  workspacePath: string,
  options: LaunchVSCodeWithWorkspaceOptions = {},
): Promise<VSCodeFixture> {
  const tempRoot = options.profileRoot
    ?? fs.mkdtempSync(path.join(selectVSCodeTempBaseDir(process.platform, os.tmpdir()), 'cgv-'));
  const userDataPath = path.join(tempRoot, 'u');
  const extensionsPath = path.join(tempRoot, 'e');
  const homePath = path.join(tempRoot, 'h');
  fs.mkdirSync(homePath, { recursive: true });
  const pluginPackageRelativePaths = options.pluginPackageRelativePaths ?? [];
  writeAcceptanceInstalledPluginCache(homePath, repoRoot(), pluginPackageRelativePaths);

  const vscodeExecutablePath = await downloadAndUnzipVSCode({
    version: VSCODE_TEST_VERSION,
    cachePath: path.join(extensionRoot(), '.vscode-test'),
  });

  const { _electron } = await import('@playwright/test');
  const app = await _electron.launch({
    executablePath: vscodeExecutablePath,
    args: createVSCodeLaunchArgs({
      extensionPath: repoRoot(),
      extensionsPath,
      platform: process.platform,
      userDataPath,
      workspacePath,
    }),
    env: {
      ...process.env,
      CODEGRAPHY_ACCEPTANCE: '1',
      CODEGRAPHY_BUNDLED_PLUGIN_PACKAGE_ROOTS: pluginPackageRelativePaths
        .map(relativePath => path.join(repoRoot(), relativePath))
        .join(path.delimiter),
      HOME: homePath,
    },
  });

  const page = await app.firstWindow({ timeout: 90_000 });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  refocusConfiguredLocalApp();

  return { app, page, tempRoot };
}

export async function openGraphView(page: Page): Promise<void> {
  const commandPaletteShortcut = process.platform === 'darwin' ? 'Meta+Shift+P' : 'Control+Shift+P';
  let lastError: unknown;

  await page.bringToFront();
  await expect.poll(() => page.title(), { timeout: VSCODE_PLAYWRIGHT_WAIT_TIMEOUT_MS }).toContain('[Extension Development Host]');

  for (let attempt = 0; attempt < OPEN_GRAPH_VIEW_COMMAND_PALETTE_ATTEMPTS; attempt += 1) {
    try {
      await page.mouse.click(640, 450);
      await page.keyboard.press(commandPaletteShortcut);
      await page.keyboard.type('CodeGraphy: Open');
      await expect(page.getByText('CodeGraphy: Open', { exact: true }).first()).toBeVisible({
        timeout: VSCODE_PLAYWRIGHT_WAIT_TIMEOUT_MS,
      });
      await page.keyboard.press('Enter');
      refocusConfiguredLocalApp();
      return;
    } catch (error) {
      lastError = error;
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  throw lastError;
}

export async function waitForGraphFrame(
  page: Page,
  timeoutMs = VSCODE_PLAYWRIGHT_WAIT_TIMEOUT_MS,
): Promise<Frame> {
  await expect.poll(async () => {
    for (const frame of page.frames().filter(candidate => candidate.url().includes('fake.html'))) {
      if (await isReadyGraphFrame(frame)) {
        return true;
      }
    }

    return false;
  }, { timeout: timeoutMs }).toBe(true);

  for (const frame of page.frames().filter(candidate => candidate.url().includes('fake.html'))) {
    if (await isReadyGraphFrame(frame)) {
      return frame;
    }
  }

  throw new Error('Expected the Graph View webview frame to contain Graph Stage');
}

async function isReadyGraphFrame(frame: Frame): Promise<boolean> {
  const graphStageCount = await frame.getByLabel('Graph Stage').count().catch(() => 0);
  const fitButtonCount = await frame.getByTitle('Fit to Screen').count().catch(() => 0);
  return graphStageCount > 0 && fitButtonCount > 0;
}

export async function cleanupVSCode({ app, tempRoot }: VSCodeFixture): Promise<void> {
  await app.close().catch(() => {});
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

export interface VSCodeLaunchArgOptions {
  readonly extensionPath: string;
  readonly extensionsPath: string;
  readonly platform: NodeJS.Platform;
  readonly userDataPath: string;
  readonly workspacePath: string;
}

export function createVSCodeLaunchArgs({
  extensionPath,
  extensionsPath,
  platform,
  userDataPath,
  workspacePath,
}: VSCodeLaunchArgOptions): string[] {
  return [
    workspacePath,
    `--extensionDevelopmentPath=${extensionPath}`,
    '--user-data-dir',
    userDataPath,
    '--extensions-dir',
    extensionsPath,
    '--use-inmemory-secretstorage',
    ...getMacKeychainArgs(platform),
    '--sync',
    'off',
    '--disable-telemetry',
    '--disable-updates',
    '--disable-workspace-trust',
    '--skip-welcome',
    '--skip-release-notes',
    '--disable-extensions',
    ...getLinuxSandboxArgs(platform),
  ];
}

export function selectVSCodeTempBaseDir(platform: NodeJS.Platform, defaultTempDir: string): string {
  return platform === 'darwin' ? '/tmp' : defaultTempDir;
}

export interface RefocusAppOptions {
  readonly appName: string | undefined;
  readonly platform: NodeJS.Platform;
}

export function resolveRefocusAppName({
  appName,
  platform,
}: RefocusAppOptions): string | undefined {
  if (platform !== 'darwin') {
    return undefined;
  }

  const normalizedName = appName?.trim();
  return normalizedName && normalizedName.length > 0 ? normalizedName : undefined;
}

export function buildMacOSAppActivationScript(appName: string): string {
  return `tell application ${JSON.stringify(appName)} to activate`;
}

function refocusConfiguredLocalApp(): void {
  const appName = resolveRefocusAppName({
    appName: process.env.CODEGRAPHY_ACCEPTANCE_REFOCUS_APP,
    platform: process.platform,
  });
  if (!appName) {
    return;
  }

  spawn('osascript', ['-e', buildMacOSAppActivationScript(appName)], {
    detached: true,
    stdio: 'ignore',
  }).unref();
}

function getMacKeychainArgs(platform: NodeJS.Platform): string[] {
  return platform === 'darwin' ? ['--use-mock-keychain'] : [];
}

function getLinuxSandboxArgs(platform: NodeJS.Platform): string[] {
  return platform === 'linux' ? ['--no-sandbox'] : [];
}
