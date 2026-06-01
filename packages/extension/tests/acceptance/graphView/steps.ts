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
  createWorkspaceTempRoot,
  EXPECTED_EXAMPLE_TYPESCRIPT_FILES,
  readExampleTypescriptFiles,
} from './workspace';
import { launchVSCodeWithWorkspace, openGraphView, waitForGraphFrame } from './vscode';

const TARGET_NODE = 'src/index.ts';

export const graphViewAcceptanceSteps: Record<string, AcceptanceStepImplementation> = {
  'I open the examples/example-typescript workspace in VS Code': async (context) => {
    context.workspaceTempRoot = createWorkspaceTempRoot();
    context.workspacePath = copyExampleTypescriptWorkspace(context.workspaceTempRoot);
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
    expect(counts.nodes).toBeGreaterThanOrEqual(EXPECTED_EXAMPLE_TYPESCRIPT_FILES.length);
    expect(counts.edges).toBe(0);
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

  'I index the workspace': async (context) => {
    await graphStage(requireGraphFrame(context)).screenshot().then(image => {
      context.beforeIndexStageImage = image;
    });
    await requireGraphFrame(context).getByRole('button', { name: 'Index Workspace' }).click();
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
    await expect(requireGraphFrame(context).getByText('Connections')).toBeVisible();
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
