import { expect, test, type Frame } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  launchVSCodeWithWorkspace,
  openGraphView,
  waitForGraphFrame,
} from '../acceptance/graphView/vscode';
import { repoRoot } from '../acceptance/graphView/workspace';

test('the five-step sample plugin contributes its node in the Dev Host graph', async () => {
  const workspacePath = createSampleWorkspace();
  const vscode = await launchVSCodeWithWorkspace(workspacePath, {
    pluginPackageRelativePaths: ['examples/sample-plugin'],
  });

  try {
    await openGraphView(vscode.page);
    const frame = await waitForGraphFrame(vscode.page);
    await indexWorkspace(frame);

    await expect.poll(() => hasSampleMarker(frame), {
      message: 'sample plugin marker is present in the live graph',
      timeout: 10_000,
    }).toBe(true);
    await expect(frame.getByRole('button', {
      name: 'Graph node demo.sample:sample-marker',
    })).toBeVisible();
  } finally {
    await vscode.app.close().catch(() => {});
    fs.rmSync(vscode.tempRoot, { recursive: true, force: true });
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
});

function createSampleWorkspace(): string {
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-sample-plugin-'));
  fs.copyFileSync(
    path.join(repoRoot(), 'examples/sample-plugin/demo.sample'),
    path.join(workspacePath, 'demo.sample'),
  );
  fs.mkdirSync(path.join(workspacePath, '.codegraphy'));
  fs.writeFileSync(
    path.join(workspacePath, '.codegraphy/settings.json'),
    `${JSON.stringify({
      version: 1,
      include: ['**/*.sample'],
      maxFiles: 20,
      respectGitignore: false,
      showOrphans: true,
      plugins: [{ id: 'sample.marker', enabled: true }],
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      disabledPluginFilterPatterns: [],
    }, null, 2)}\n`,
  );
  return workspacePath;
}

async function indexWorkspace(frame: Frame): Promise<void> {
  const button = frame.getByRole('button', { name: 'Index Workspace' });
  if (await button.count() > 0 && await button.first().isVisible().catch(() => false)) {
    await button.click();
  }
}

async function hasSampleMarker(frame: Frame): Promise<boolean> {
  return frame.evaluate(() => window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().nodes
    .some(node => node.id === 'demo.sample:sample-marker') ?? false);
}
