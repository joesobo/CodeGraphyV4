import { expect, test, type Frame } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  launchVSCodeWithWorkspace,
  openGraphView,
  waitForGraphFrame,
} from '../acceptance/graphView/vscode';

test('copy paste collisions and cut move work through graph keyboard actions', async ({}, testInfo) => {
  const workspacePath = createClipboardWorkspace();
  const vscode = await launchVSCodeWithWorkspace(workspacePath);

  try {
    await openGraphView(vscode.page);
    const frame = await waitForGraphFrame(vscode.page);
    await indexWorkspace(frame);

    const sourceA = frame.getByRole('button', { name: 'Graph node src/a.ts' });
    const sourceB = frame.getByRole('button', { name: 'Graph node src/b.ts' });
    const destination = frame.getByRole('button', { name: 'Graph node dest', exact: true });

    await sourceA.focus();
    await sourceA.press('Enter');
    await sourceA.press('Control+c');
    await destination.focus();
    await destination.press('Enter');
    await destination.press('Control+v');
    await expect.poll(() => fs.existsSync(path.join(workspacePath, 'dest/a.ts'))).toBe(true);

    await destination.press('Control+v');
    await expect.poll(() => fs.existsSync(path.join(workspacePath, 'dest/a copy.ts'))).toBe(true);

    await sourceB.focus();
    await sourceB.press('Enter');
    await sourceB.press('Control+x');
    await destination.focus();
    await destination.press('Enter');
    await destination.press('Control+v');
    await expect.poll(() => ({
      destination: fs.existsSync(path.join(workspacePath, 'dest/b.ts')),
      source: fs.existsSync(path.join(workspacePath, 'src/b.ts')),
    })).toEqual({ destination: true, source: false });

    const screenshotPath = testInfo.outputPath('clipboard-files-complete.png');
    await frame.getByLabel('Graph Stage').screenshot({ path: screenshotPath });
    await testInfo.attach('clipboard files complete', {
      path: screenshotPath,
      contentType: 'image/png',
    });
  } finally {
    await vscode.app.close().catch(() => {});
    fs.rmSync(vscode.tempRoot, { recursive: true, force: true });
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
});

function createClipboardWorkspace(): string {
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-clipboard-files-'));
  fs.mkdirSync(path.join(workspacePath, 'src'));
  fs.mkdirSync(path.join(workspacePath, 'dest'));
  fs.writeFileSync(path.join(workspacePath, 'src/a.ts'), 'export const a = 1;\n');
  fs.writeFileSync(path.join(workspacePath, 'src/b.ts'), 'export const b = 2;\n');
  fs.writeFileSync(path.join(workspacePath, 'dest/keep.ts'), 'export const keep = true;\n');
  fs.mkdirSync(path.join(workspacePath, '.codegraphy'));
  fs.writeFileSync(path.join(workspacePath, '.codegraphy/settings.json'), `${JSON.stringify({
    version: 1,
    include: ['**/*.ts'],
    maxFiles: 20,
    respectGitignore: false,
    showOrphans: true,
    nodeVisibility: { folder: true },
    plugins: [],
    filterPatterns: [],
    disabledCustomFilterPatterns: [],
    disabledPluginFilterPatterns: [],
  }, null, 2)}\n`);
  return workspacePath;
}

async function indexWorkspace(frame: Frame): Promise<void> {
  const button = frame.getByRole('button', { name: 'Index Workspace' });
  if (await button.count() > 0 && await button.first().isVisible().catch(() => false)) {
    await button.click();
  }
  await expect.poll(() => frame.evaluate(() => (
    window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().nodes.length ?? 0
  )), { timeout: 30_000 }).toBeGreaterThan(3);
}
