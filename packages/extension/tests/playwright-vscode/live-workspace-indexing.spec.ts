import { expect, test } from '@playwright/test';
import { readWorkspaceAnalysisDatabaseSnapshot } from '@codegraphy-dev/core';
import fs from 'node:fs';
import path from 'node:path';
import {
  clickToolbarButton,
  findNodeProbe,
  graphNode,
  requireGraphFrame,
  rightClickGraphBackground,
  rightClickNode,
} from '../acceptance/graphView/canvas';
import { createGraphViewAcceptanceContext } from '../acceptance/graphView/context';
import { openGraphScopeSection, setPanelSwitch } from '../acceptance/graphView/steps';
import { launchVSCodeWithWorkspace, openGraphView, waitForGraphFrame } from '../acceptance/graphView/vscode';
import { copyExampleTypescriptWorkspace, createWorkspaceTempRoot } from '../acceptance/graphView/workspace';

for (const { kind, name } of [
  { kind: 'File', name: 'bug-247-child.ts' },
  { kind: 'Folder', name: 'bug-247-child' },
] as const) {
  test(`Folder Node New ${kind} publishes the child Node without Re-index`, async () => {
    const context = await createGraphViewAcceptanceContext(undefined);
    try {
      context.workspaceTempRoot = createWorkspaceTempRoot();
      context.workspacePath = copyExampleTypescriptWorkspace(context.workspaceTempRoot, { includeImportEdges: false, includeNestsEdges: true });
      context.vscode = await launchVSCodeWithWorkspace(context.workspacePath);
      await openGraphView(context.vscode.page);
      context.graphFrame = await waitForGraphFrame(context.vscode.page);
      let frame = requireGraphFrame(context);
      await frame.getByRole('button', { name: 'Index Workspace' }).click();
      await expect(frame.getByRole('progressbar', { name: 'Indexing progress' })).toBeHidden({ timeout: 30_000 });
      await openGraphScopeSection(context, 'Node Types');
      await setPanelSwitch(context, 'Folder', true);
      await clickToolbarButton(frame, 'Graph Scope');
      await findNodeProbe(context, 'src');
      await rightClickNode(context, 'src');
      await frame.getByText(`New ${kind}`, { exact: true }).last().click();
      const input = context.vscode.page.locator('.quick-input-widget input').first();
      await input.fill(name);
      await input.press('Enter');
      const relativePath = `src/${name}`;
      await expect.poll(() => fs.existsSync(path.join(context.workspacePath!, relativePath)), { timeout: 10_000 }).toBe(true);
      context.graphFrame = await waitForGraphFrame(context.vscode.page);
      frame = requireGraphFrame(context);
      await expect(graphNode(frame, relativePath)).toBeAttached({ timeout: 15_000 });
    } finally {
      await context.cleanup();
    }
  });
}

test('background and toolbar creation publish root Nodes without Re-index', async () => {
  const context = await createGraphViewAcceptanceContext(undefined);
  try {
    context.workspaceTempRoot = createWorkspaceTempRoot();
    context.workspacePath = copyExampleTypescriptWorkspace(context.workspaceTempRoot, {
      includeImportEdges: false,
      includeNestsEdges: true,
    });
    context.vscode = await launchVSCodeWithWorkspace(context.workspacePath);
    await openGraphView(context.vscode.page);
    context.graphFrame = await waitForGraphFrame(context.vscode.page);
    let frame = requireGraphFrame(context);
    await frame.getByRole('button', { name: 'Index Workspace' }).click();
    await expect(frame.getByRole('progressbar', { name: 'Indexing progress' }))
      .toBeHidden({ timeout: 30_000 });
    await openGraphScopeSection(context, 'Node Types');
    await setPanelSwitch(context, 'Folder', true);
    await clickToolbarButton(frame, 'Graph Scope');

    await rightClickGraphBackground(context);
    await frame.getByText('New File', { exact: true }).last().click();
    const input = context.vscode.page.locator('.quick-input-widget input').first();
    await input.fill('background-created.ts');
    await input.press('Enter');
    await expect(graphNode(frame, 'background-created.ts')).toBeAttached({ timeout: 15_000 });

    context.graphFrame = await waitForGraphFrame(context.vscode.page);
    frame = requireGraphFrame(context);
    await frame.getByRole('button', { name: 'New...', exact: true }).click();
    await frame.getByText('New Folder...', { exact: true }).last().click();
    await input.fill('toolbar-created-folder');
    await input.press('Enter');
    await expect(graphNode(frame, 'toolbar-created-folder')).toBeAttached({ timeout: 15_000 });
  } finally {
    await context.cleanup();
  }
});

test('external workspace changes stay current while the Graph View is hidden', async () => {
  const context = await createGraphViewAcceptanceContext(undefined);
  try {
    context.workspaceTempRoot = createWorkspaceTempRoot();
    context.workspacePath = copyExampleTypescriptWorkspace(context.workspaceTempRoot, { includeImportEdges: false, includeNestsEdges: true });
    context.vscode = await launchVSCodeWithWorkspace(context.workspacePath);
    await openGraphView(context.vscode.page);
    context.graphFrame = await waitForGraphFrame(context.vscode.page);
    let frame = requireGraphFrame(context);
    await frame.getByRole('button', { name: 'Index Workspace' }).click();
    await expect(frame.getByRole('progressbar', { name: 'Indexing progress' })).toBeHidden({ timeout: 30_000 });
    await openGraphScopeSection(context, 'Node Types');
    await setPanelSwitch(context, 'Folder', false);
    await clickToolbarButton(frame, 'Graph Scope');
    await context.vscode.page.keyboard.press('Meta+Shift+E');
    await expect(context.vscode.page.getByRole('tree', { name: 'Files Explorer' })).toBeVisible();

    fs.writeFileSync(path.join(context.workspacePath, 'external-created.ts'), 'export const created = true;\n');
    fs.mkdirSync(path.join(context.workspacePath, 'external-folder'));
    fs.writeFileSync(
      path.join(context.workspacePath, 'external-folder', 'nested.ts'),
      'export const nested = true;\n',
    );
    fs.mkdirSync(path.join(context.workspacePath, 'external-empty-folder'));
    await expect.poll(
      () => readWorkspaceAnalysisDatabaseSnapshot(context.workspacePath!).graph.nodes
        .map((node: { id: string }) => node.id),
      { timeout: 15_000 },
    ).toEqual(expect.arrayContaining([
      'external-created.ts',
      'external-empty-folder',
      'external-folder/nested.ts',
    ]));

    const changedContents = 'export const created = "saved again";\n';
    fs.writeFileSync(path.join(context.workspacePath, 'external-created.ts'), changedContents);
    await expect.poll(
      () => readWorkspaceAnalysisDatabaseSnapshot(context.workspacePath!).files
        .find(file => file.filePath === 'external-created.ts')?.size,
      { timeout: 15_000 },
    ).toBe(Buffer.byteLength(changedContents));

    fs.renameSync(
      path.join(context.workspacePath, 'external-created.ts'),
      path.join(context.workspacePath, 'external-renamed.ts'),
    );
    fs.renameSync(
      path.join(context.workspacePath, 'external-folder'),
      path.join(context.workspacePath, 'external-renamed-folder'),
    );
    fs.renameSync(
      path.join(context.workspacePath, 'external-empty-folder'),
      path.join(context.workspacePath, 'external-renamed-empty-folder'),
    );
    await expect.poll(
      () => readWorkspaceAnalysisDatabaseSnapshot(context.workspacePath!).graph.nodes
        .map((node: { id: string }) => node.id),
      { timeout: 15_000 },
    ).toEqual(expect.arrayContaining([
      'external-renamed.ts',
      'external-renamed-empty-folder',
      'external-renamed-folder/nested.ts',
    ]));
    await expect.poll(
      () => readWorkspaceAnalysisDatabaseSnapshot(context.workspacePath!).graph.nodes
        .map((node: { id: string }) => node.id),
      { timeout: 15_000 },
    ).toEqual(expect.not.arrayContaining([
      'external-created.ts',
      'external-empty-folder',
      'external-folder/nested.ts',
    ]));

    fs.rmSync(path.join(context.workspacePath, 'external-renamed-folder'), { recursive: true });
    fs.rmSync(path.join(context.workspacePath, 'external-renamed-empty-folder'), { recursive: true });
    await expect.poll(
      () => readWorkspaceAnalysisDatabaseSnapshot(context.workspacePath!).graph.nodes
        .map((node: { id: string }) => node.id),
      { timeout: 15_000 },
    ).toEqual(expect.not.arrayContaining([
      'external-renamed-empty-folder',
      'external-renamed-folder/nested.ts',
    ]));

    await openGraphView(context.vscode.page);
    context.graphFrame = await waitForGraphFrame(context.vscode.page);
    frame = requireGraphFrame(context);
    await expect(graphNode(frame, 'external-renamed.ts')).toBeAttached({ timeout: 15_000 });
    await expect(graphNode(frame, 'external-created.ts')).toHaveCount(0);
    await expect(graphNode(frame, 'external-empty-folder')).toHaveCount(0);
    await expect(graphNode(frame, 'external-renamed-empty-folder')).toHaveCount(0);
    await expect(graphNode(frame, 'external-renamed-folder/nested.ts')).toHaveCount(0);
  } finally {
    await context.cleanup();
  }
});
