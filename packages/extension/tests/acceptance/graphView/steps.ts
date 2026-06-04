import { expect } from '@playwright/test';
import {
  clickNode,
  countChangedBytes,
  countVisibleGraphPixels,
  distanceBetween,
  dragNode,
  expectNodeHasLabel,
  expectNodeHasWhiteCenterSymbol,
  expectNodeIsOutlined,
  expectNodeLooksBlue,
  expectNodeStaysDropped,
  expectVisibleEdgeBetween,
  findNodeProbe,
  getGraphCounts,
  graphStage,
  hoverNode,
  recordDroppedNodeCenter,
  requireGraphFrame,
  waitForFileOpened,
} from './canvas';
import { requireValue } from './context';
import type { AcceptanceStepImplementation } from './types';
import {
  copyExampleTypescriptWorkspace,
  copyExampleVueWorkspace,
  createWorkspaceTempRoot,
  EXPECTED_EXAMPLE_TYPESCRIPT_FILES,
  EXPECTED_EXAMPLE_VUE_FILES,
  readExampleTypescriptFiles,
  readExampleVueFiles,
} from './workspace';
import { launchVSCodeWithWorkspace, openGraphView, waitForGraphFrame } from './vscode';

const TARGET_NODE = 'src/index.ts';

async function expectGraphCounts(
  context: Parameters<AcceptanceStepImplementation>[0],
  nodes: number,
  edges: number,
): Promise<void> {
  await expect.poll(async () => getGraphCounts(requireGraphFrame(context))).toEqual({ nodes, edges });
}

async function expectOrphanNode(
  context: Parameters<AcceptanceStepImplementation>[0],
  nodePath: string,
): Promise<void> {
  const frame = requireGraphFrame(context);
  await findNodeProbe(context, nodePath);
  const touchingEdges = await frame.locator('[aria-label^="Graph edge "]').evaluateAll((elements, path) =>
    elements
      .map(element => element.getAttribute('aria-label') ?? '')
      .filter(label => label.startsWith(`Graph edge ${path} to `) || label.endsWith(` to ${path}`)),
    nodePath,
  );

  expect(touchingEdges).toEqual([]);
}

export const graphViewAcceptanceSteps: Record<string, AcceptanceStepImplementation> = {
  'I open the examples/example-typescript workspace in VS Code': async (context) => {
    context.workspaceTempRoot = createWorkspaceTempRoot();
    context.workspacePath = copyExampleTypescriptWorkspace(context.workspaceTempRoot);
  },

  'I open the examples/vue-example workspace in VS Code': async (context) => {
    context.workspaceTempRoot = createWorkspaceTempRoot();
    context.workspacePath = copyExampleVueWorkspace(context.workspaceTempRoot);
  },

  'I open the CodeGraphy extension graph view': async (context) => {
    const workspacePath = requireValue(context.workspacePath, 'Expected example workspace to be open');
    context.vscode = await launchVSCodeWithWorkspace(workspacePath);
    await openGraphView(context.vscode.page);
    context.graphFrame = await waitForGraphFrame(context.vscode.page);
  },

  'I see graph nodes': async (context) => {
    const frame = requireGraphFrame(context);

    await expect(graphStage(frame)).toBeVisible();
    await expect.poll(() => countVisibleGraphPixels(frame)).toBeGreaterThan(0);
    const counts = await getGraphCounts(frame);
    expect(counts.nodes).toBeGreaterThan(0);
    context.beforeIndexNodeCount = counts.nodes;
  },

  'I do not see edges': async (context) => {
    await expect.poll(async () => (await getGraphCounts(requireGraphFrame(context))).edges).toBe(0);
    context.beforeIndexStageImage = await graphStage(requireGraphFrame(context)).screenshot();
  },

  'the graph nodes match the expected files in the examples/example-typescript workspace': async (context) => {
    const workspacePath = requireValue(context.workspacePath, 'Expected example workspace to be open');
    expect(readExampleTypescriptFiles(workspacePath)).toEqual(EXPECTED_EXAMPLE_TYPESCRIPT_FILES);
    const counts = await getGraphCounts(requireGraphFrame(context));
    expect(counts.nodes).toBe(EXPECTED_EXAMPLE_TYPESCRIPT_FILES.length);
  },

  'the graph nodes match the expected files in the examples/vue-example workspace': async (context) => {
    const workspacePath = requireValue(context.workspacePath, 'Expected example workspace to be open');
    expect(readExampleVueFiles(workspacePath)).toEqual(EXPECTED_EXAMPLE_VUE_FILES);
    await expectGraphCounts(context, EXPECTED_EXAMPLE_VUE_FILES.length, 7);
  },

  'I index the workspace': async (context) => {
    await graphStage(requireGraphFrame(context)).screenshot().then(image => {
      context.beforeIndexStageImage = image;
    });
    await requireGraphFrame(context).getByRole('button', { name: 'Index Workspace' }).click();
  },

  'I have indexed the workspace': async (context) => {
    await graphStage(requireGraphFrame(context)).screenshot().then(image => {
      context.beforeIndexStageImage = image;
    });
    await requireGraphFrame(context).getByRole('button', { name: 'Index Workspace' }).click();
    await expect(
      requireGraphFrame(context).getByRole('progressbar', { name: 'Indexing progress' }),
    ).toBeHidden({ timeout: 30_000 });
  },

  'I see indexing progress': async (context) => {
    await expect(requireGraphFrame(context).getByRole('progressbar', { name: 'Indexing progress' })).toBeVisible();
  },

  'I see indexing progress disappear': async (context) => {
    await expect(
      requireGraphFrame(context).getByRole('progressbar', { name: 'Indexing progress' }),
    ).toBeHidden({ timeout: 30_000 });
  },

  'the graph nodes have not changed': async (context) => {
    const beforeNodeCount = requireValue(context.beforeIndexNodeCount, 'Expected pre-index node count');
    const counts = await getGraphCounts(requireGraphFrame(context));
    expect(counts.nodes).toBe(beforeNodeCount);
  },

  'I see edges': async (context) => {
    const frame = requireGraphFrame(context);
    const beforeImage = requireValue(context.beforeIndexStageImage, 'Expected pre-index Graph Stage screenshot');

    await expect.poll(async () => (await getGraphCounts(frame)).edges).toBeGreaterThan(0);
    const afterImage = await graphStage(frame).screenshot();
    expect(countChangedBytes(beforeImage, afterImage)).toBeGreaterThan(500);
  },

  'I can see there are 14 nodes and 7 connections': async (context) => {
    await expectGraphCounts(context, 14, 7);
  },

  'I can see there are 14 nodes and 10 connections': async (context) => {
    await expectGraphCounts(context, 14, 10);
  },

  'I click the Graph Scope button': async (context) => {
    await requireGraphFrame(context).getByRole('button', { name: 'Graph Scope' }).click();
  },

  'I see to buttons for switching views between node type and edge type toggles': async (context) => {
    const frame = requireGraphFrame(context);
    await expect(frame.getByRole('button', { name: 'Node Types' })).toBeVisible();
    await expect(frame.getByRole('button', { name: 'Edge Types' })).toBeVisible();
  },

  'I select edge types': async (context) => {
    await requireGraphFrame(context).getByRole('button', { name: 'Edge Types' }).click();
  },

  'I see a list of edge types with toggles': async (context) => {
    await expect(requireGraphFrame(context).getByLabel('Toggle Imports')).toBeVisible();
  },

  'I toggle the Type imports edge on': async (context) => {
    await requireGraphFrame(context).getByLabel('Toggle Type imports').click();
  },

  'I close the Graph Scope': async (context) => {
    await requireGraphFrame(context).getByRole('button', { name: 'Close' }).click();
  },

  'src/main.ts points to src/App.vue': async (context) => {
    await expectVisibleEdgeBetween(context, 'src/main.ts', 'src/App.vue');
  },

  'src/App.vue points to src/components/CounterPanel.vue': async (context) => {
    await expectVisibleEdgeBetween(context, 'src/App.vue', 'src/components/CounterPanel.vue');
  },

  'src/App.vue points to src/components/UserCard.vue': async (context) => {
    await expectVisibleEdgeBetween(context, 'src/App.vue', 'src/components/UserCard.vue');
  },

  'src/App.vue points to src/data/users.ts': async (context) => {
    await expectVisibleEdgeBetween(context, 'src/App.vue', 'src/data/users.ts');
  },

  'src/App.vue points to src/composables/useCounter.ts': async (context) => {
    await expectVisibleEdgeBetween(context, 'src/App.vue', 'src/composables/useCounter.ts');
  },

  'src/data/users.ts points to src/types.ts': async (context) => {
    await expectVisibleEdgeBetween(context, 'src/data/users.ts', 'src/types.ts');
  },

  'src/components/UserCard.vue points to src/types.ts': async (context) => {
    await expectVisibleEdgeBetween(context, 'src/components/UserCard.vue', 'src/types.ts');
  },

  'src/components/CounterPanel.vue points to src/components/StatusBadge.vue': async (context) => {
    await expectVisibleEdgeBetween(context, 'src/components/CounterPanel.vue', 'src/components/StatusBadge.vue');
  },

  'src/components/CounterPanel.vue points to src/composables/useCounter.ts': async (context) => {
    await expectVisibleEdgeBetween(context, 'src/components/CounterPanel.vue', 'src/composables/useCounter.ts');
  },

  'src/components/CounterPanel.vue points to src/types.ts': async (context) => {
    await expectVisibleEdgeBetween(context, 'src/components/CounterPanel.vue', 'src/types.ts');
  },

  'README.md is an orphan node': async (context) => {
    await expectOrphanNode(context, 'README.md');
  },

  '.gitignore is an orphan node': async (context) => {
    await expectOrphanNode(context, '.gitignore');
  },

  'package.json is an orphan node': async (context) => {
    await expectOrphanNode(context, 'package.json');
  },

  'tsconfig.json is an orphan node': async (context) => {
    await expectOrphanNode(context, 'tsconfig.json');
  },

  'vite.config.ts is an orphan node': async (context) => {
    await expectOrphanNode(context, 'vite.config.ts');
  },

  'I see the src/index.ts node': async (context) => {
    await findNodeProbe(context, TARGET_NODE);
  },

  'the src/index.ts node is a blue circle': async (context) => {
    const frame = requireGraphFrame(context);
    await expectNodeLooksBlue(frame, await findNodeProbe(context, TARGET_NODE));
  },

  'the src/index.ts node has a white TS symbol in the center of the node': async (context) => {
    const frame = requireGraphFrame(context);
    await expectNodeHasWhiteCenterSymbol(frame, await findNodeProbe(context, TARGET_NODE));
  },

  'the src/index.ts node has the file name "index.ts" as a label below the node': async (context) => {
    const frame = requireGraphFrame(context);
    await expectNodeHasLabel(frame, await findNodeProbe(context, TARGET_NODE));
  },

  'the src/index.ts node has an edge that points to the src/types.ts node': async (context) => {
    await expectVisibleEdgeBetween(context, TARGET_NODE, 'src/types.ts');
  },

  'the src/index.ts node has an edge that points to the src/utils.ts node': async (context) => {
    await expectVisibleEdgeBetween(context, TARGET_NODE, 'src/utils.ts');
  },

  'I hover the src/index.ts node': async (context) => {
    await hoverNode(context, TARGET_NODE);
  },

  'I see information for the src/index.ts node': async (context) => {
    await expect(requireGraphFrame(context).getByText('Connections', { exact: true })).toBeVisible();
  },

  'the information says "src/index.ts" at the top': async (context) => {
    await expect(requireGraphFrame(context).getByText('src/index.ts', { exact: true }).first()).toBeVisible();
  },

  'I click the src/index.ts node': async (context) => {
    await clickNode(context, TARGET_NODE);
  },

  'the src/index.ts node is visibly outlined': async (context) => {
    await expectNodeIsOutlined(requireGraphFrame(context), await findNodeProbe(context, TARGET_NODE));
  },

  'src/index.ts opens in VS Code': async (context) => {
    const vscode = requireValue(context.vscode, 'Expected VS Code to be launched');
    await waitForFileOpened(vscode.page, 'index.ts');
  },

  'I click and drag the src/index.ts node': async (context) => {
    await dragNode(context, TARGET_NODE);
  },

  'the src/index.ts node moves': async (context) => {
    const beforeDragCenter = requireValue(context.beforeDragCenter, 'Expected a node drag to start');
    const afterDragCenter = requireValue(context.afterDragCenter, 'Expected a node drag to finish');

    expect(distanceBetween(beforeDragCenter, afterDragCenter)).toBeGreaterThan(20);
  },

  'I stop dragging the src/index.ts node': async (context) => {
    await recordDroppedNodeCenter(context);
  },

  'the src/index.ts node stays where I drop it': async (context) => {
    await expectNodeStaysDropped(context);
  },
};
