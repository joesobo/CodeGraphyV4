import { expect, test, type Frame } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  launchVSCodeWithWorkspace,
  openGraphView,
  waitForGraphFrame,
} from '../acceptance/graphView/vscode';

test('New File creates a nested path from the graph toolbar', async ({}, testInfo) => {
  const workspacePath = createWorkspace();
  const vscode = await launchVSCodeWithWorkspace(workspacePath);

  try {
    await openGraphView(vscode.page);
    const frame = await waitForGraphFrame(vscode.page);
    await indexWorkspace(frame);

    await frame.getByTitle('New...').click();
    await frame.getByText('New File...', { exact: true }).click();
    const input = frame.getByRole('textbox', { name: 'New file name' });
    await expect(input).toBeVisible();
    await input.fill('nested/deep/example.ts');
    await input.press('Enter');

    const createdPath = path.join(workspacePath, 'nested/deep/example.ts');
    await expect.poll(() => fs.existsSync(createdPath)).toBe(true);
    await expect.poll(() => frame.evaluate(() => (
      window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().nodes
        .some(node => node.id === 'nested/deep/example.ts') ?? false
    ))).toBe(true);

    const screenshotPath = testInfo.outputPath('nested-create-complete.png');
    await frame.getByLabel('Graph Stage').screenshot({ path: screenshotPath });
    await testInfo.attach('nested create complete', {
      path: screenshotPath,
      contentType: 'image/png',
    });
  } finally {
    await vscode.app.close().catch(() => {});
    fs.rmSync(vscode.tempRoot, { recursive: true, force: true });
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
});

function createWorkspace(): string {
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-nested-create-'));
  fs.writeFileSync(path.join(workspacePath, 'seed.ts'), 'export const seed = true;\n');
  fs.mkdirSync(path.join(workspacePath, '.codegraphy'));
  fs.writeFileSync(path.join(workspacePath, '.codegraphy/settings.json'), `${JSON.stringify({
    version: 1,
    include: ['**/*.ts'],
    maxFiles: 20,
    respectGitignore: false,
    showOrphans: true,
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
  )), { timeout: 30_000 }).toBeGreaterThan(0);
}
