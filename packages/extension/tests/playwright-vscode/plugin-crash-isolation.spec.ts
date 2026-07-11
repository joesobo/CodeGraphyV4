import { expect, test, type Frame } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  launchVSCodeWithWorkspace,
  openGraphView,
  waitForGraphFrame,
} from '../acceptance/graphView/vscode';

test('a throwing analysis plugin is disabled while the graph remains usable', async () => {
  const workspacePath = createThrowingPluginWorkspace();
  const vscode = await launchVSCodeWithWorkspace(workspacePath, {
    pluginPackageRelativePaths: ['packages/extension/tests/fixtures/throwing-plugin'],
  });

  try {
    await openGraphView(vscode.page);
    const frame = await waitForGraphFrame(vscode.page);
    await indexWorkspace(frame);

    await expect(vscode.page.getByText(
      /CodeGraphy disabled plugin 'fixture\.throwing' after analyzeFile failed: deliberate acceptance fixture failure/,
    )).toBeVisible({ timeout: 10_000 });
    await expect.poll(() => readGraphNodeIds(frame), { timeout: 10_000 })
      .toContain('demo.throw');
    await expect(frame.getByTitle('Fit to Screen')).toBeVisible();
  } finally {
    await vscode.app.close().catch(() => {});
    fs.rmSync(vscode.tempRoot, { recursive: true, force: true });
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
});

function createThrowingPluginWorkspace(): string {
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-throwing-plugin-'));
  fs.writeFileSync(path.join(workspacePath, 'demo.throw'), 'throw\n');
  fs.mkdirSync(path.join(workspacePath, '.codegraphy'));
  fs.writeFileSync(path.join(workspacePath, '.codegraphy/settings.json'), `${JSON.stringify({
    version: 1,
    include: ['**/*.throw'],
    maxFiles: 20,
    respectGitignore: false,
    showOrphans: true,
    plugins: [{ id: 'fixture.throwing', enabled: true }],
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

async function readGraphNodeIds(frame: Frame): Promise<string[]> {
  return frame.evaluate(() => window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().nodes
    .map(node => node.id) ?? []);
}
