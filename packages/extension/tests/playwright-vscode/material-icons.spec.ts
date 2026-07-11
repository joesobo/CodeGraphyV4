import { expect, test, type Frame } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  launchVSCodeWithWorkspace,
  openGraphView,
  waitForGraphFrame,
} from '../acceptance/graphView/vscode';

test('Material Icon Theme styles graph nodes through its bundled public plugin', async () => {
  const workspacePath = createMaterialIconWorkspace();
  const vscode = await launchVSCodeWithWorkspace(workspacePath);

  try {
    await openGraphView(vscode.page);
    const frame = await waitForGraphFrame(vscode.page);
    await indexWorkspace(frame);

    await expect.poll(() => readNodeImageUrl(frame, 'package.json'), {
      message: 'package.json receives a rendered Material icon data URL',
      timeout: 10_000,
    }).toMatch(/^data:image\/svg\+xml;base64,/);

    await frame.getByTitle('Themes').click();
    const legendIcon = frame.getByAltText('package.json icon');
    await expect(legendIcon).toBeVisible();
    await expect.poll(() => legendIcon.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  } finally {
    await vscode.app.close().catch(() => {});
    fs.rmSync(vscode.tempRoot, { recursive: true, force: true });
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
});

function createMaterialIconWorkspace(): string {
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-material-icons-'));
  fs.writeFileSync(path.join(workspacePath, 'package.json'), '{"name":"material-icons-gate"}\n');
  fs.mkdirSync(path.join(workspacePath, 'src'));
  fs.writeFileSync(path.join(workspacePath, 'src', 'main.ts'), 'export const ready = true;\n');
  fs.mkdirSync(path.join(workspacePath, '.codegraphy'));
  fs.writeFileSync(path.join(workspacePath, '.codegraphy', 'settings.json'), `${JSON.stringify({
    version: 1,
    include: ['**/*'],
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
}

async function readNodeImageUrl(frame: Frame, nodeId: string): Promise<string | undefined> {
  return frame.evaluate((id) => window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().nodes
    .find((node) => node.id === id)?.imageUrl, nodeId);
}
