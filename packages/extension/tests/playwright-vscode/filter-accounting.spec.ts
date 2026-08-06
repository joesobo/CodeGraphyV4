import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { clickToolbarButton, getGraphCounts } from '../acceptance/graphView/canvas';
import {
  copyExampleWorkspace,
  createWorkspaceTempRoot,
} from '../acceptance/graphView/workspace';
import {
  cleanupVSCode,
  launchVSCodeWithWorkspace,
  openGraphView,
  waitForGraphFrame,
} from '../acceptance/graphView/vscode';

test('reports plugin default Filter effects in an Extension Development Host', async ({}, testInfo) => {
  const workspaceTempRoot = createWorkspaceTempRoot();
  const workspacePath = copyExampleWorkspace(workspaceTempRoot, 'example-typescript', {
    pluginPackages: [],
  });
  const filteredFilePath = path.join(workspacePath, '.next', 'generated.js');
  fs.mkdirSync(path.dirname(filteredFilePath), { recursive: true });
  fs.writeFileSync(filteredFilePath, 'export const generated = true;\n');
  const proofDirectory = process.env.CODEGRAPHY_VISUAL_PROOF_DIR ?? testInfo.outputDir;
  fs.mkdirSync(proofDirectory, { recursive: true });
  const vscode = await launchVSCodeWithWorkspace(workspacePath, {
    pluginPackageRelativePaths: ['packages/plugin-typescript'],
  });

  try {
    await openGraphView(vscode.page);
    const frame = await waitForGraphFrame(vscode.page);
    await indexWorkspace(frame);
    const beforeCounts = await getGraphCounts(frame);

    await frame.getByRole('button', { name: /^Filters,/ }).click();
    await expect(frame.getByText('Before analysis: 0 workspace files excluded')).toBeVisible();
    await expect(frame.getByText('In Graph View: 0 Nodes excluded')).toBeVisible();
    await vscode.page.screenshot({
      path: path.join(proofDirectory, 'trello-242-before.png'),
    });

    await frame.getByRole('button', { name: /^Filters,/ }).click();
    await clickToolbarButton(frame, 'Plugins');
    await frame.getByRole('switch', { name: 'TypeScript/JavaScript' }).click();
    await expect(frame.getByRole('switch', { name: 'TypeScript/JavaScript' })).toBeChecked();
    await expect(frame.getByRole('progressbar', { name: 'Indexing progress' })).toBeHidden({ timeout: 30_000 });
    await clickToolbarButton(frame, 'Plugins');
    await frame.getByTitle('Re-index Workspace').click();
    await expect(frame.getByRole('progressbar', { name: 'Indexing progress' })).toBeHidden({ timeout: 30_000 });
    await expect.poll(() => getGraphCounts(frame)).toEqual({
      nodes: beforeCounts.nodes - 1,
      edges: expect.any(Number),
    });

    await frame.getByRole('button', { name: /^Filters,/ }).click();
    await expect(frame.getByText('Before analysis: 1 workspace file excluded')).toBeVisible();
    await expect(frame.getByText('In Graph View: 0 Nodes excluded')).toBeVisible();
    await vscode.page.screenshot({
      path: path.join(proofDirectory, 'trello-242-after.png'),
    });
  } finally {
    await cleanupVSCode(vscode);
    fs.rmSync(workspaceTempRoot, { recursive: true, force: true });
  }
});

async function indexWorkspace(frame: Parameters<typeof getGraphCounts>[0]): Promise<void> {
  const indexButton = frame.getByRole('button', { name: 'Index Workspace' });
  await expect(indexButton).toBeVisible();
  await indexButton.click();
  await expect(
    frame.getByRole('progressbar', { name: 'Indexing progress' }),
  ).toBeHidden({ timeout: 30_000 });
}
