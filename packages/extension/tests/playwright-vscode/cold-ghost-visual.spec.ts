import { expect, test, type Frame, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  launchVSCodeWithWorkspace,
  openGraphView,
  waitForGraphFrame,
} from '../acceptance/graphView/vscode';
import {
  copyExampleTypescriptWorkspace,
  createWorkspaceTempRoot,
} from '../acceptance/graphView/workspace';

test('cold webview reload paints the persisted ghost graph by 100ms', async ({}, testInfo) => {
  const workspaceTempRoot = createWorkspaceTempRoot();
  const workspacePath = copyExampleTypescriptWorkspace(workspaceTempRoot);
  const profileRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-cold-ghost-'));
  const vscode = await launchVSCodeWithWorkspace(workspacePath, { profileRoot });

  try {
    await openGraphView(vscode.page);
    const initialFrame = await waitForGraphFrame(vscode.page);
    await ensureIndexed(initialFrame);
    await expect.poll(() => readRuntimeNodeCount(initialFrame), { timeout: 30_000 }).toBeGreaterThan(0);
    await vscode.page.waitForTimeout(2_000);

    await reloadWebviews(vscode.page);
    await vscode.page.waitForTimeout(100);
    const ghostFrame = newestGraphFrame(vscode.page);
    expect(ghostFrame, 'Graph webview frame must exist at t+100ms').toBeDefined();
    const evidence = await ghostFrame!.evaluate(readGhostPixelEvidence);
    expect(evidence.ghostVisible).toBe(true);
    expect(evidence.nonTransparentPixels).toBeGreaterThan(0);

    const screenshotPath = testInfo.outputPath('cold-ghost-t-plus-100ms.png');
    await ghostFrame!.getByLabel('Graph Stage').screenshot({ path: screenshotPath });
    await testInfo.attach('cold ghost t+100ms', { path: screenshotPath, contentType: 'image/png' });
  } finally {
    await vscode.app.close().catch(() => {});
    fs.rmSync(profileRoot, { recursive: true, force: true });
    fs.rmSync(workspaceTempRoot, { recursive: true, force: true });
  }
});

async function ensureIndexed(frame: Frame): Promise<void> {
  const button = frame.getByRole('button', { name: 'Index Workspace' });
  if (await button.count() > 0 && await button.first().isVisible().catch(() => false)) {
    await button.click();
    await expect.poll(() => readRuntimeNodeCount(frame), { timeout: 30_000 }).toBeGreaterThan(0);
  }
}

async function readRuntimeNodeCount(frame: Frame): Promise<number> {
  return frame.evaluate(() => window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().nodes.length ?? 0);
}

async function reloadWebviews(page: Page): Promise<void> {
  const shortcut = process.platform === 'darwin' ? 'Meta+Shift+P' : 'Control+Shift+P';
  await page.keyboard.press(shortcut);
  await page.keyboard.type('Developer: Reload Webviews');
  await expect(page.getByText('Developer: Reload Webviews', { exact: true }).first()).toBeVisible();
  await page.keyboard.press('Enter');
}

function newestGraphFrame(page: Page): Frame | undefined {
  return page.frames().filter(frame => frame.url().includes('fake.html')).at(-1);
}

function readGhostPixelEvidence(): { ghostVisible: boolean; nonTransparentPixels: number } {
  const ghostVisible = document.querySelector('[data-codegraphy-ghost="true"]') !== null;
  let nonTransparentPixels = 0;
  for (const canvas of document.querySelectorAll('canvas')) {
    const context = canvas.getContext('2d');
    if (!context || canvas.width === 0 || canvas.height === 0) continue;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] > 0) nonTransparentPixels += 1;
    }
  }
  return { ghostVisible, nonTransparentPixels };
}
