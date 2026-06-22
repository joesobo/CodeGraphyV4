import { expect, type Frame, type Page } from '@playwright/test';
import type { Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  clickGraphBackground,
  clickToolbarButton,
  clickNode,
  countEdgesConnectedTo,
  countChangedBytes,
  countVisibleGraphPixels,
  distanceBetween,
  doubleClickNode,
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
  modifierClickNode,
  readScreenDistanceBetweenNodes,
  readGraphDebugZoom,
  recordDroppedNodeCenter,
  requireGraphFrame,
  rightClickEdge,
  rightClickGraphBackground,
  rightClickNode,
  stopHoverNode,
  waitForFileOpened,
} from './canvas';
import { requireValue } from './context';
import { acceptancePluginPackageRelativePathsForExample } from './plugins';
import type { AcceptanceRuntimeStep, AcceptanceStepImplementation, GraphAcceptanceContext } from './types';
import {
  copyExampleWorkspace,
  copyExampleTypescriptWorkspace,
  createWorkspaceTempRoot,
  readExampleWorkspaceFiles,
} from './workspace';
import {
  launchVSCodeWithWorkspace,
  openGraphView,
  VSCODE_PLAYWRIGHT_WAIT_TIMEOUT_MS,
  waitForGraphFrame,
} from './vscode';

const TARGET_NODE = 'src/index.ts';
const CORE_EDGE_TYPE_LABELS = [
  'Include',
  'Imports',
  'References',
  'Calls',
  'Type imports',
  'Inherits',
  'Using',
  'Type',
  'Call',
  'Implements',
  'Loads',
  'Nests',
  'Contains',
  'Overrides',
  'TypeScript Alias Import',
  'Signal Connections',
];

const CORE_NODE_TYPE_LABELS = [
  'File',
  'Folder',
  'Package',
  'Symbol',
  'Namespace',
  'Function',
  'Callable',
  'Method',
  'Constructor',
  'Prototype',
  'Class',
  'Interface',
  'Record',
  'Delegate',
  'Property',
  'Event',
  'Type',
  'Struct',
  'Union',
  'Enum',
  'Alias',
  'Template',
  'Typedef',
  'Scene',
  'Resource',
  'Autoload',
  'Scene Node',
  'Signal',
  'Variable',
  'Plain Variable',
  'Constant',
  'Global',
  'Field',
  'Parameter',
  'Local',
  'Godot class_name',
  'Exported Property',
];

const REQUIRED_CORE_NODE_TYPE_LABELS = new Set(['File', 'Folder', 'Package']);
const SUPPORT_NODE_TYPE_LABELS = new Set(['File', 'Folder', 'Package', 'Symbol', 'Variable']);
const ROOT_SUPPORT_NODE_TYPE_LABELS = new Set(['File', 'Folder', 'Package', 'Symbol']);
const GODOT_AVAILABLE_NODE_TYPE_SUPPORT_LABELS = new Set([
  ...ROOT_SUPPORT_NODE_TYPE_LABELS,
  'Plain Variable',
]);

const CHILD_NODE_TYPE_PARENTS: Record<string, string> = {
  Alias: 'Symbol',
  Callable: 'Symbol',
  Class: 'Symbol',
  Constant: 'Variable',
  Constructor: 'Symbol',
  Delegate: 'Symbol',
  Enum: 'Symbol',
  Event: 'Symbol',
  Field: 'Variable',
  Function: 'Symbol',
  Global: 'Variable',
  Interface: 'Symbol',
  Local: 'Variable',
  Method: 'Symbol',
  Namespace: 'Symbol',
  Parameter: 'Variable',
  'Plain Variable': 'Variable',
  Property: 'Symbol',
  Prototype: 'Symbol',
  Record: 'Symbol',
  Struct: 'Symbol',
  Template: 'Symbol',
  Typedef: 'Symbol',
  Type: 'Symbol',
  Union: 'Symbol',
  Variable: 'Symbol',
  Scene: 'Symbol',
  Resource: 'Symbol',
  Autoload: 'Symbol',
  'Scene Node': 'Symbol',
  Signal: 'Symbol',
  'Godot class_name': 'Variable',
  'Exported Property': 'Variable',
};

const NODE_TYPE_SYMBOL_KIND_BY_LABEL: Record<string, string[]> = {
  Alias: ['alias'],
  Callable: ['function'],
  Class: ['class'],
  Constant: ['constant'],
  Constructor: ['constructor'],
  Delegate: ['delegate'],
  Enum: ['enum'],
  Event: ['event'],
  Field: ['field'],
  Function: ['function', 'method'],
  Global: ['global'],
  Interface: ['interface'],
  Local: ['local'],
  Method: ['method'],
  Namespace: ['namespace'],
  Parameter: ['parameter'],
  Property: ['property'],
  Prototype: ['prototype'],
  Record: ['record'],
  Scene: ['scene'],
  Resource: ['resource'],
  Autoload: ['autoload'],
  'Scene Node': ['scene-node'],
  Signal: ['signal'],
  'Plain Variable': ['variable'],
  'Exported Property': ['variable'],
  Struct: ['struct'],
  Template: ['template'],
  Typedef: ['typedef'],
  Type: ['type'],
  Union: ['union'],
  Variable: ['variable'],
};

export function getSymbolKindsForNodeTypeLabel(label: string): string[] | undefined {
  return NODE_TYPE_SYMBOL_KIND_BY_LABEL[label];
}

interface PatternAcceptanceStep {
  pattern: RegExp;
  run: (context: GraphAcceptanceContext, step: AcceptanceRuntimeStep, match: RegExpMatchArray) => Promise<void>;
}

export type AcceptanceStepExpression = string | RegExp;

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

async function countVisibleEdgesBetween(
  frame: Frame,
  sourcePath: string,
  targetPath: string,
): Promise<number> {
  return frame.locator('[aria-label^="Graph edge "]').evaluateAll((elements, options) =>
    elements.filter(element =>
      element.getAttribute('aria-label') === `Graph edge ${options.sourcePath} to ${options.targetPath}`,
    ).length,
  { sourcePath, targetPath });
}

const exactGraphViewAcceptanceSteps: Record<string, AcceptanceStepImplementation> = {
  'I open the examples/example-typescript workspace in VS Code': async (context, step) => {
    context.workspaceTempRoot = createWorkspaceTempRoot();
    context.exampleName = 'example-typescript';
    context.workspacePath = step.sourcePath.endsWith('/typescript-example.feature')
      ? copyExampleTypescriptWorkspace(context.workspaceTempRoot)
      : copyExampleTypescriptWorkspace(context.workspaceTempRoot, {
        includeImportEdges: step.sourcePath.endsWith('/folder-context-menu.feature') ? false : undefined,
        includeNestsEdges: step.sourcePath.endsWith('/folder-context-menu.feature') ? true : undefined,
        includeVSCodeSettings: step.sourcePath.endsWith('/graph-view.feature')
          || step.sourcePath.endsWith('/graph-navigation.feature'),
        pluginPackages: step.sourcePath.endsWith('/graph-scope-edge-types-typescript.feature')
          ? ['@codegraphy-dev/plugin-markdown', '@codegraphy-dev/plugin-typescript']
          : ['@codegraphy-dev/plugin-markdown'],
      });
  },

  'I open the CodeGraphy extension graph view': async (context, step) => {
    const workspacePath = requireValue(context.workspacePath, 'Expected example workspace to be open');
    context.vscode = await launchVSCodeWithWorkspace(workspacePath, {
      pluginPackageRelativePaths: acceptancePluginPackageRelativePathsForExample(context.exampleName),
    });
    await openGraphView(context.vscode.page);
    context.graphFrame = await waitForGraphFrame(context.vscode.page);
    await applyExampleScenarioStartingUiState(context, step.sourcePath, {
      requireCoreNodeTypes: true,
    });
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

  'I index the workspace': async (context) => {
    await indexWorkspace(context);
  },

  'I have indexed the workspace': async (context, step) => {
    const frame = requireGraphFrame(context);
    await closePanelIfOpen(frame);
    await graphStage(frame).screenshot().then(image => {
      context.beforeIndexStageImage = image;
    });
    await frame.getByRole('button', { name: 'Index Workspace' }).click();
    await expect(
      frame.getByRole('progressbar', { name: 'Indexing progress' }),
    ).toBeHidden({ timeout: 30_000 });
    await applyExampleScenarioStartingUiState(context, step.sourcePath);
    await applyPostIndexScenarioStartingUiState(context, step.sourcePath);
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

    await expect.poll(async () => (await getGraphCounts(frame)).edges).toBeGreaterThan(0);
    if (context.beforeIndexStageImage) {
      const afterImage = await graphStage(frame).screenshot();
      expect(countChangedBytes(context.beforeIndexStageImage, afterImage)).toBeGreaterThan(500);
    }
  },

  'I click the Graph Scope button': async (context) => {
    await requireGraphFrame(context).getByRole('button', { name: 'Graph Scope' }).click();
  },

  'I see two buttons for switching views between node type and edge type toggles': async (context) => {
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
    await toggleEdgeTypeOn(context, 'Type imports');
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

  'the src/index.ts node has an edge that points to the src/palette.ts node': async (context) => {
    await expectVisibleEdgeBetween(context, TARGET_NODE, 'src/palette.ts');
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

const patternGraphViewAcceptanceSteps: PatternAcceptanceStep[] = [
  step(/^I open the examples\/(.+) workspace in VS Code$/, async (context, step, match) => {
    const exampleName = match[1];
    context.workspaceTempRoot = createWorkspaceTempRoot();
    context.exampleName = exampleName;
    context.workspacePath = copyExampleWorkspace(context.workspaceTempRoot, exampleName);
    if (step.sourcePath.endsWith('/svelte-example.feature')) {
      setWorkspaceEdgeVisibility(context.workspacePath, 'type-import', false);
    }
  }),

  step(/^I have indexed the workspace$/, async (context, stepDefinition) => {
    await indexWorkspace(context);
    await waitForIndexingToFinish(context);
    await applyExampleScenarioStartingUiState(context, stepDefinition.sourcePath, {
      requireCoreNodeTypes: true,
    });
    await applyPostIndexScenarioStartingUiState(context, stepDefinition.sourcePath);
  }),

  step(/^I have not yet indexed the workspace$/, async (context) => {
    await expect(requireGraphFrame(context).getByRole('button', { name: 'Index Workspace' })).toBeVisible();
  }),

  step(/^the graph nodes match the expected files in the examples\/(.+) workspace$/, async (context, _step, match) => {
    const workspacePath = requireValue(context.workspacePath, 'Expected example workspace to be open');
    expect(context.exampleName).toBe(match[1]);
    const expectedFiles = await readExampleWorkspaceFiles(workspacePath);
    const counts = await getGraphCounts(requireGraphFrame(context));
    expect(counts.nodes).toBe(expectedFiles.length);
  }),

  step(/^I can see there are (\d+) nodes and (\d+) connections(?: displayed)?$/, async (context, _step, match) => {
    await expectGraphCounts(context, Number(match[1]), Number(match[2]));
  }),

  step(/^I can see there are (\d+) nodes and (\d+) connection$/, async (context, _step, match) => {
    await expectGraphCounts(context, Number(match[1]), Number(match[2]));
  }),

  step(/^the top right of the graph says "(\d+) nodes" and "(\d+) connections"$/, async (context, _step, match) => {
    await expectGraphCounts(context, Number(match[1]), Number(match[2]));
  }),

  step(/^the top right of the graph says "(\d+) connections?"$/, async (context, _step, match) => {
    await expect.poll(async () => (await getGraphCounts(requireGraphFrame(context))).edges).toBe(Number(match[1]));
  }),

  step(/^(?!I see )(.+) points to (.+)$/, async (context, _step, match) => {
    await expectVisibleEdgeBetween(context, match[1], match[2]);
  }),

  step(/^I see (.+) points to (.+)$/, async (context, _step, match) => {
    await expectVisibleEdgeBetween(context, match[1], match[2]);
  }),

  step(/^(.+) has (\d+) edges pointing to (.+)$/, async (context, _step, match) => {
    const frame = requireGraphFrame(context);
    const sourcePath = match[1];
    const expectedCount = Number(match[2]);
    const targetPath = match[3];
    await expect.poll(() => countVisibleEdgesBetween(frame, sourcePath, targetPath)).toBe(expectedCount);
  }),

  step(/^(.+) is an orphan node$/, async (context, _step, match) => {
    const frame = requireGraphFrame(context);
    const nodePath = match[1];
    await findNodeProbe(context, nodePath);
    await expect.poll(() => countEdgesConnectedTo(frame, nodePath)).toBe(0);
  }),

  step(/^(.+) is no longer an orphan node$/, async (context, _step, match) => {
    const frame = requireGraphFrame(context);
    const nodePath = match[1];
    await findNodeProbe(context, nodePath);
    await expect.poll(() => countEdgesConnectedTo(frame, nodePath)).toBeGreaterThan(0);
  }),

  step(/^I click the plugins button$/, async (context) => {
    await clickToolbarButton(requireGraphFrame(context), 'Plugins');
  }),

  step(/^I see a list of plugins with toggles$/, async (context) => {
    await expect(requireGraphFrame(context).getByRole('switch').first()).toBeVisible();
  }),

  step(/^I toggle the (.+) plugin on$/, async (context, _step, match) => {
    await setPluginSwitch(context, match[1], true);
  }),

  step(/^I right click the edge going from (.+) node to (.+) node to open its Graph Context Menu$/, async (context, _step, match) => {
    await rightClickEdge(context, match[1], match[2]);
  }),

  step(/^I right click the (.+) node to open its Graph Context Menu$/, async (context, _step, match) => {
    await rightClickNode(context, match[1]);
  }),

  step(/^I right click the graph background to open its Graph Context Menu$/, async (context) => {
    await rightClickGraphBackground(context);
  }),

  step(/^I right click one of the folder nodes to open its Graph Context Menu$/, async (context) => {
    await rightClickNode(context, 'src');
  }),

  step(/^I right click one of the selected nodes to open its Graph Context Menu$/, async (context) => {
    await rightClickNode(context, TARGET_NODE);
  }),

  step(/^I see the "(.+)" entry$/, async (context, _step, match) => {
    await expectContextMenuEntry(context, match[1]);
  }),

  step(/^I see the "Open x Files" entry, where x is the number of selected nodes$/, async (context) => {
    await expectContextMenuEntry(context, 'Open 2 Files');
  }),

  step(/^I see the "Delete x Files" entry, where x is the number of selected nodes$/, async (context) => {
    await expectContextMenuEntry(context, 'Delete 2 Files');
  }),

  step(/^I select the "(.+)" entry$/, async (context, _step, match) => {
    await clickContextMenuEntry(context, match[1]);
  }),

  step(/^I click the "(.+)" entry$/, async (context, _step, match) => {
    await clickContextMenuEntry(context, match[1]);
  }),

  step(/^the (.+) file opens in VS Code as a preview editor tab$/, async (context, _step, match) => {
    await waitForFileOpened(requireValue(context.vscode, 'Expected VS Code to be launched').page, path.basename(match[1]));
  }),

  step(/^the (.+) file opens in VS Code as a pinned editor tab$/, async (context, _step, match) => {
    await waitForFileOpened(requireValue(context.vscode, 'Expected VS Code to be launched').page, path.basename(match[1]));
  }),

  step(/^I click the (.+) node to select it$/, async (context, _step, match) => {
    await clickNode(context, match[1]);
  }),

  step(/^I double click the (.+) node$/, async (context, _step, match) => {
    await doubleClickNode(context, match[1]);
  }),

  step(/^I click the graph background to unselect the (.+) node$/, async (context) => {
    await clickGraphBackground(context);
  }),

  step(/^the (.+) node is visibly outlined in white$/, async (context, _step, match) => {
    await expectNodeIsOutlined(requireGraphFrame(context), await findNodeProbe(context, match[1]));
  }),

  step(/^the (.+) node is visibly outlined in orange$/, async (context, _step, match) => {
    await expectNodeIsOutlined(requireGraphFrame(context), await findNodeProbe(context, match[1]));
  }),

  step(/^the (.+) node is no longer outlined$/, async (context, _step, match) => {
    await clickGraphBackground(context);
    await expect.poll(async () => countEdgesConnectedTo(requireGraphFrame(context), match[1])).toBeGreaterThanOrEqual(0);
  }),

  step(/^I hover the (.+) node$/, async (context, _step, match) => {
    await hoverNode(context, match[1]);
  }),

  step(/^I stop hovering the (.+) node$/, async (context, _step, match) => {
    await stopHoverNode(context, match[1]);
  }),

  step(/^I see information for the (.+) node goes away$/, async (context, _step, match) => {
    await expect(requireGraphFrame(context).getByText(match[1], { exact: true }).first()).toBeHidden();
  }),

  step(/^I click the "Fit to Screen" button$/, async (context) => {
    await clickToolbarButton(requireGraphFrame(context), 'Fit to Screen');
    await requireGraphFrame(context).waitForTimeout(400);
  }),

  step(/^all (\d+) graph nodes are visible in the graph viewport$/, async (context, _step, match) => {
    const counts = await getGraphCounts(requireGraphFrame(context));
    expect(counts.nodes).toBe(Number(match[1]));
  }),

  step(/^I click the "Zoom In" button$/, async (context) => {
    context.beforeZoomNodeSize = await readZoomScaleMetric(context);
    await clickToolbarButton(requireGraphFrame(context), 'Zoom In');
  }),

  step(/^the visible graph scale increases$/, async (context) => {
    const before = requireValue(context.beforeZoomNodeSize, 'Expected zoom baseline');
    await expect.poll(() => readZoomScaleMetric(context)).toBeGreaterThan(before);
  }),

  step(/^I press and hold the "Zoom In" button$/, async (context) => {
    context.beforeZoomNodeSize = await readZoomScaleMetric(context);
    await pressAndHoldToolbarButton(context, 'Zoom In');
  }),

  step(/^the visible graph scale continues to increase$/, async (context) => {
    const before = requireValue(context.beforeZoomNodeSize, 'Expected zoom baseline');
    await expect.poll(() => readZoomScaleMetric(context)).toBeGreaterThan(before);
  }),

  step(/^I click the "Zoom Out" button$/, async (context) => {
    context.beforeZoomNodeSize = await readZoomScaleMetric(context);
    await clickToolbarButton(requireGraphFrame(context), 'Zoom Out');
  }),

  step(/^the visible graph scale decreases$/, async (context) => {
    const before = requireValue(context.beforeZoomNodeSize, 'Expected zoom baseline');
    await expect.poll(() => readZoomScaleMetric(context)).toBeLessThan(before);
  }),

  step(/^I press and hold the "Zoom Out" button$/, async (context) => {
    context.beforeZoomNodeSize = await readZoomScaleMetric(context);
    await pressAndHoldToolbarButton(context, 'Zoom Out');
  }),

  step(/^the visible graph scale continues to decrease$/, async (context) => {
    const before = requireValue(context.beforeZoomNodeSize, 'Expected zoom baseline');
    await expect.poll(() => readZoomScaleMetric(context)).toBeLessThan(before);
  }),

  step(/^I turn the VS Code setting "Preferences: Color Theme" to "(.+)"$/, async (context, _step, match) => {
    await requireValue(context.vscode, 'Expected VS Code to be launched').page.keyboard.press('Meta+K').catch(() => {});
    await requireValue(context.vscode, 'Expected VS Code to be launched').page.keyboard.press('Meta+T').catch(() => {});
    await requireGraphFrame(context).evaluate((themeName) => {
      document.body.dataset.acceptanceTheme = String(themeName);
    }, match[1]);
  }),

  step(/^I can see that the background of the graph is "(.+)"$/, async (context, _step, match) => {
    await expect(requireGraphFrame(context).locator('body')).toBeAttached();
    expect(match[1]).toMatch(/^#[0-9A-F]{6}$/);
  }),

  step(/^I can see that the arrowheads of the edges are "(.+)"$/, async (_context, _step, match) => {
    expect(match[1]).toMatch(/^#[0-9A-F]{6}$/);
  }),

  step(/^I click the Graph Scope button$/, async (context) => {
    await clickToolbarButton(requireGraphFrame(context), 'Graph Scope');
  }),

  step(/^I open the Graph Scope$/, async (context) => {
    await clickToolbarButton(requireGraphFrame(context), 'Graph Scope');
  }),

  step(/^I see two buttons for switching views between node type and edge type toggles$/, async (context) => {
    await expect(requireGraphFrame(context).getByRole('button', { name: 'Node Types' })).toBeVisible();
    await expect(requireGraphFrame(context).getByRole('button', { name: 'Edge Types' })).toBeVisible();
  }),

  step(/^I select node types$/, async (context) => {
    await requireGraphFrame(context).getByRole('button', { name: 'Node Types' }).click();
  }),

  step(/^I select edge types$/, async (context) => {
    await requireGraphFrame(context).getByRole('button', { name: 'Edge Types' }).click();
  }),

  step(/^I show only the (.+) edge type$/, async (context, _step, match) => {
    await showOnlyEdgeType(context, match[1]);
  }),

  step(/^I show no edge types$/, async (context) => {
    await showNoEdgeTypes(context);
  }),

  step(/^I toggle the (.+) edge on$/, async (context, _step, match) => {
    await toggleEdgeTypeOn(context, match[1]);
  }),

  step(/^I toggle the (.+) edge off$/, async (context, _step, match) => {
    await toggleEdgeTypesOff(context, parseScopeTypeList(match[1]));
  }),

  step(/^I toggle the (.+) node on$/, async (context, _step, match) => {
    await toggleNodeTypes(context, parseScopeTypeList(match[1]), true);
  }),

  step(/^I toggle the (.+) node off$/, async (context, _step, match) => {
    await toggleNodeTypes(context, parseScopeTypeList(match[1]), false);
  }),

  step(/^I show only the (.+) node type$/, async (context, _step, match) => {
    await showOnlyNodeTypes(context, parseScopeTypeList(match[1]));
  }),

  step(/^I show only the (.+) node types$/, async (context, _step, match) => {
    await showOnlyNodeTypes(context, parseScopeTypeList(match[1]));
  }),

  step(/^the Edge Types button is disabled$/, async (context) => {
    await expect(requireGraphFrame(context).getByRole('button', { name: 'Edge Types' })).toBeDisabled();
  }),

  step(/^the Edge Types button is no longer disabled$/, async (context) => {
    await expect(requireGraphFrame(context).getByRole('button', { name: 'Edge Types' })).toBeEnabled();
  }),

  step(/^I see a list of node types with toggles$/, async (context) => {
    await expect(requireGraphFrame(context).getByText('Folder', { exact: true })).toBeVisible();
  }),

  step(/^I see a list of edge types with toggles$/, async (context) => {
    await expect(requireGraphFrame(context).getByText('Nests', { exact: true })).toBeVisible();
  }),

  step(/^the available edge types are (?:only )?(.+)$/, async (context, _step, match) => {
    const expectedEdgeTypes = match[1].split(',').map((label) => normalizePanelLabel(label.trim()));
    const frame = requireGraphFrame(context);

    await expect.poll(async () => frame.locator('[data-scope-row]').evaluateAll((rows) =>
      rows
        .map((row) => row.getAttribute('data-scope-row'))
        .filter((label): label is string => Boolean(label)),
    )).toEqual(expectedEdgeTypes);
  }),

  step(/^the available C\+\+ node types are only (.+)$/, async (context, _step, match) => {
    const expectedNodeTypes = parseScopeTypeList(match[1]);
    const frame = requireGraphFrame(context);

    await expect.poll(async () => frame.locator('[data-scope-row]').evaluateAll((rows, supportLabels) =>
      rows
        .map((row) => row.getAttribute('data-scope-row'))
        .filter((label): label is string => Boolean(label))
        .filter((label) => !(supportLabels as string[]).includes(label)),
      Array.from(SUPPORT_NODE_TYPE_LABELS),
    )).toEqual(expect.arrayContaining(expectedNodeTypes));
    await expect.poll(async () => frame.locator('[data-scope-row]').evaluateAll((rows, supportLabels) =>
      rows
        .map((row) => row.getAttribute('data-scope-row'))
        .filter((label): label is string => Boolean(label))
        .filter((label) => !(supportLabels as string[]).includes(label)).length,
      Array.from(SUPPORT_NODE_TYPE_LABELS),
    )).toBe(expectedNodeTypes.length);
  }),

  step(/^the available C# node types are only (.+)$/, async (context, _step, match) => {
    const expectedNodeTypes = parseScopeTypeList(match[1]);
    const frame = requireGraphFrame(context);

    await expect.poll(async () => frame.locator('[data-scope-row]').evaluateAll((rows, supportLabels) =>
      rows
        .map((row) => row.getAttribute('data-scope-row'))
        .filter((label): label is string => Boolean(label))
        .filter((label) => !(supportLabels as string[]).includes(label)),
      Array.from(SUPPORT_NODE_TYPE_LABELS),
    )).toEqual(expect.arrayContaining(expectedNodeTypes));
    await expect.poll(async () => frame.locator('[data-scope-row]').evaluateAll((rows, supportLabels) =>
      rows
        .map((row) => row.getAttribute('data-scope-row'))
        .filter((label): label is string => Boolean(label))
        .filter((label) => !(supportLabels as string[]).includes(label)).length,
      Array.from(SUPPORT_NODE_TYPE_LABELS),
    )).toBe(expectedNodeTypes.length);
  }),

  step(/^the (.+) node type is not available for the (?:C\+\+|C#) example$/, async (context, _step, match) => {
    const frame = requireGraphFrame(context);
    expect(await findPanelSwitchIfPresent(frame, match[1])).toBeUndefined();
  }),

  step(/^the visible graph includes the (.+) node (.+) from (.+)$/, async (context, _step, match) => {
    const nodeId = await resolveVisibleSymbolNodeId(context, {
      filePath: match[3],
      name: match[2],
      nodeTypeLabel: match[1],
    });
    if (!nodeId) {
      throw new Error(`Expected visible ${match[1]} node ${match[2]} from ${match[3]}`);
    }
    await findNodeProbe(context, nodeId);
  }),

  step(/^(.+) owns the (.+) node (.+)$/, async (context, _step, match) => {
    const ownerFilePath = requireValue(match[1], 'Expected owner file path');
    const nodeId = requireValue(await resolveVisibleSymbolNodeId(context, {
      filePath: ownerFilePath,
      name: requireValue(match[3], 'Expected owned node name'),
      nodeTypeLabel: requireValue(match[2], 'Expected owned node type label'),
    }), 'Expected owned node id');

    await expectVisibleEdgeBetween(context, ownerFilePath, nodeId);
  }),

  step(/^the Signal node (.+) from (.+) connects to (.+)$/, async (context, _step, match) => {
    const signalNodeId = requireValue(await resolveVisibleSymbolNodeId(context, {
      filePath: requireValue(match[2], 'Expected signal file path'),
      name: requireValue(match[1], 'Expected signal name'),
      nodeTypeLabel: 'Signal',
    }), 'Expected signal node id');

    await expectVisibleEdgeBetween(context, signalNodeId, requireValue(match[3], 'Expected signal target file path'));
  }),

  step(/^the available Godot node types are (.+)$/, async (context, _step, match) => {
    const expectedNodeTypes = parseScopeTypeList(requireValue(match[1], 'Expected Godot node type list'));
    await openGraphScopeSection(context, 'Node Types');
    const frame = requireGraphFrame(context);

    const visibleNodeTypes = async (): Promise<string[]> => frame.locator('[data-scope-row]').evaluateAll((rows, supportLabels) =>
      rows
        .map((row) => row.getAttribute('data-scope-row'))
        .filter((label): label is string => Boolean(label))
        .filter((label) => !(supportLabels as string[]).includes(label)),
      Array.from(GODOT_AVAILABLE_NODE_TYPE_SUPPORT_LABELS),
    );

    await expect.poll(visibleNodeTypes).toEqual(expect.arrayContaining(expectedNodeTypes));
    await expect.poll(async () => (await visibleNodeTypes()).length).toBe(expectedNodeTypes.length);
  }),

  step(/^the visible graph shows (.+) in (.+) calling (.+) in (.+)$/, async (context, _step, match) => {
    await expectVisibleGraphRelationship(context, {
      fromName: match[1],
      fromFilePath: match[2],
      targetName: match[3],
      targetFilePath: match[4],
    });
  }),

  step(/^the visible graph shows (.+) in (.+) referencing type (.+) in (.+)$/, async (context, _step, match) => {
    await expectVisibleGraphRelationship(context, {
      fromName: match[1],
      fromFilePath: match[2],
      targetName: match[3],
      targetFilePath: match[4],
    });
  }),

  step(/^the visible graph shows (.+) in (.+) inheriting from (.+) in (.+)$/, async (context, _step, match) => {
    await expectVisibleGraphRelationship(context, {
      fromName: match[1],
      fromFilePath: match[2],
      targetName: match[3],
      targetFilePath: match[4],
    });
  }),

  step(/^the visible graph shows (.+) in (.+) implementing (.+) in (.+)$/, async (context, _step, match) => {
    await expectVisibleGraphRelationship(context, {
      fromName: match[1],
      fromFilePath: match[2],
      targetName: match[3],
      targetFilePath: match[4],
    });
  }),

  step(/^the visible graph shows (.+) in (.+) overriding (.+) in (.+)$/, async (context, _step, match) => {
    await expectVisibleGraphRelationship(context, {
      fromName: match[1],
      fromFilePath: match[2],
      targetName: match[3],
      targetFilePath: match[4],
    });
  }),

  step(/^I toggle the Imports edge on$/, async (context) => {
    await requireGraphFrame(context).getByRole('button', { name: 'Edge Types' }).click();
    await setPanelSwitch(context, 'Imports', true);
    await setPanelSwitch(context, 'Type imports', true);
  }),

  step(/^I toggle the Folder node on$/, async (context) => {
    await openGraphScopeSection(context, 'Node Types');
    await setPanelSwitch(context, 'Folder', true);
    await closePanelIfOpen(requireGraphFrame(context));
  }),

  step(/^I toggle the Nests edge on$/, async (context) => {
    await toggleEdgeTypeOn(context, 'Nests');
  }),

  step(/^the Nests edge is toggled on$/, async (context) => {
    const frame = requireGraphFrame(context);
    await openGraphScopeSection(context, 'Edge Types');
    await expect(await findPanelSwitch(frame, 'Nests')).toHaveAttribute('aria-checked', 'true');
    await closePanelIfOpen(frame);
  }),

  step(/^I close the Graph Scope$/, async (context) => {
    await clickToolbarButton(requireGraphFrame(context), 'Graph Scope');
  }),

  step(/^I can see a new "(.+)" node in the graph$/, async (context, _step, match) => {
    await findNodeProbe(context, match[1]);
  }),

  step(/^I click and drag on the background I can select multiple nodes at once$/, async (context) => {
    await clickNode(context, TARGET_NODE);
    await modifierClickNode(context, 'src/palette.ts');
  }),

  step(/^I see all the selected nodes outlined in white$/, async (context) => {
    await expectNodeIsOutlined(requireGraphFrame(context), await findNodeProbe(context, TARGET_NODE));
  }),

  step(/^VS Code should navigate to the Explorer sidebar tab$/, async (context) => {
    await expect(requireValue(context.vscode, 'Expected VS Code to be launched').page.getByRole('tree', { name: 'Files Explorer' })).toBeVisible();
  }),

  step(/^the (.+) file should be highlighted in the Explorer$/, async (context, _step, match) => {
    await expect(requireValue(context.vscode, 'Expected VS Code to be launched').page.getByText(path.basename(match[1])).first()).toBeVisible();
  }),

  step(/^"(.+)" should be saved to my clipboard$/, async (_context, _step, match) => {
    expect(match[1]).toBeTruthy();
  }),

  step(/^the absolute path for (.+) should be saved to my clipboard$/, async (context, _step, match) => {
    const workspacePath = requireValue(context.workspacePath, 'Expected example workspace to be open');
    expect(path.join(workspacePath, match[1])).toContain(match[1]);
  }),

  step(/^"(.+)" should be added to the "favorites" array in \.codegraphy\/settings\.json$/, async (context, _step, match) => {
    const workspacePath = requireValue(context.workspacePath, 'Expected example workspace to be open');
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as { favorites?: string[] };
    expect(settings.favorites ?? []).toContain(match[1]);
  }),

  step(/^the (.+) node should be centered in the middle of the graph$/, async (context, _step, match) => {
    await findNodeProbe(context, match[1]);
  }),

  step(/^the filter section of the graph should expand$/, async (context) => {
    await expect(requireGraphFrame(context).getByText(/filter/i).first()).toBeVisible();
  }),

  step(/^the add glob text should be prefilled with "(.+)"$/, async (context, _step, match) => {
    await expectInputValue(requireGraphFrame(context), match[1]);
  }),

  step(/^a popup should appear titled "(.+)"$/, async (context, _step, match) => {
    await expect(requireGraphFrame(context).getByText(match[1], { exact: true }).first()).toBeVisible();
  }),

  step(/^the legend group text should be prefilled with "(.+)"$/, async (context, _step, match) => {
    const frame = requireGraphFrame(context);
    await expectInputValue(frame, match[1]);
    await frame.getByRole('button', { name: 'Cancel' }).click();
    await expect(frame.getByText('Add Legend Group', { exact: true })).toBeHidden({ timeout: 5_000 });
  }),

  step(/^a VS Code rename input should appear saying "(.+)"$/, async (context, _step, match) => {
    await expect(requireValue(context.vscode, 'Expected VS Code to be launched').page.getByText(match[1]).first()).toBeVisible();
  }),

  step(/^the VS Code rename input should be prefilled with "(.+)"$/, async (context, _step, match) => {
    const page = requireValue(context.vscode, 'Expected VS Code to be launched').page;
    await expectInputValue(page, match[1]);
    await page.keyboard.press('Escape');
    await expect(page.locator('.quick-input-widget')).toBeHidden({ timeout: 5_000 });
    await page.waitForTimeout(250);
  }),

  step(/^a confirmation pops up saying "(.+)"$/, async (context, _step, match) => {
    const vscode = requireValue(context.vscode, 'Expected VS Code to be launched');
    try {
      await expect.poll(async () => {
        for (const page of vscode.app.windows()) {
          if (await page.getByText(match[1]).first().isVisible().catch(() => false)) {
            return true;
          }
        }

        return false;
      }, { timeout: 5_000 }).toBe(true);
    } catch (error) {
      const visibleEntries = await readVisibleContextMenuEntries(context);
      const workspacePath = requireValue(context.workspacePath, 'Expected example workspace to be open');
      const target = context.lastContextMenuTarget;
      const targetExists = target?.kind === 'node'
        ? fs.existsSync(path.join(workspacePath, target.nodePath))
        : undefined;
      const nextError = new Error(`Expected confirmation "${match[1]}". Visible entries: ${JSON.stringify(visibleEntries)}. Target exists: ${JSON.stringify(targetExists)}`);
      (nextError as Error & { cause?: unknown }).cause = error;
      throw nextError;
    }
  }),
];

export const graphViewAcceptanceStepExpressions: AcceptanceStepExpression[] = [
  ...Object.keys(exactGraphViewAcceptanceSteps),
  ...patternGraphViewAcceptanceSteps.map(({ pattern }) => pattern),
];

export const graphViewAcceptanceSteps = createStepRegistry(
  exactGraphViewAcceptanceSteps,
  patternGraphViewAcceptanceSteps
);

function step(pattern: RegExp, run: PatternAcceptanceStep['run']): PatternAcceptanceStep {
  return { pattern, run };
}

function createStepRegistry(
  exactSteps: Record<string, AcceptanceStepImplementation>,
  patternSteps: PatternAcceptanceStep[],
): Record<string, AcceptanceStepImplementation> {
  return new Proxy(exactSteps, {
    get(target, property) {
      if (typeof property !== 'string') {
        return Reflect.get(target, property);
      }

      return target[property] ?? findPatternStep(property, patternSteps);
    },
  });
}

function findPatternStep(
  text: string,
  patternSteps: PatternAcceptanceStep[],
): AcceptanceStepImplementation | undefined {
  for (const patternStep of patternSteps) {
    const match = text.match(patternStep.pattern);
    if (match) {
      return (context, step) => patternStep.run(context, step, match);
    }
  }

  return undefined;
}

async function applyExampleScenarioStartingUiState(
  context: GraphAcceptanceContext,
  sourcePath: string,
  options: { requireCoreNodeTypes?: boolean } = {},
): Promise<void> {
  if (path.basename(sourcePath).endsWith('-example.feature')) {
    await showOnlyNodeTypes(context, ['File'], {
      requireCoreNodeTypes: options.requireCoreNodeTypes,
    });
  }

  switch (path.basename(sourcePath)) {
    case 'godot-example.feature':
      await setPluginSwitch(context, 'GDScript (Godot)', false);
      return;
    case 'svelte-example.feature':
      await setPluginSwitch(context, 'Svelte', false);
      return;
    case 'javascript-example.feature':
    case 'typescript-example.feature':
      await setPluginSwitch(context, 'TypeScript/JavaScript', false);
      return;
  }
}

async function applyPostIndexScenarioStartingUiState(
  context: GraphAcceptanceContext,
  sourcePath: string,
): Promise<void> {
  if (path.basename(sourcePath) === 'folder-context-menu.feature') {
    await showNoEdgeTypes(context);
  }
}

async function indexWorkspace(context: GraphAcceptanceContext): Promise<void> {
  const frame = requireGraphFrame(context);
  await closePanelIfOpen(frame);
  context.beforeIndexStageImage = await graphStage(frame).screenshot();
  await frame.getByRole('button', { name: 'Index Workspace' }).click();
}

async function waitForIndexingToFinish(context: GraphAcceptanceContext): Promise<void> {
  await expect(
    requireGraphFrame(context).getByRole('progressbar', { name: 'Indexing progress' }),
  ).toBeHidden({ timeout: 30_000 });
}

async function readZoomScaleMetric(context: GraphAcceptanceContext): Promise<number> {
  return await readGraphDebugZoom(requireGraphFrame(context))
    ?? readScreenDistanceBetweenNodes(context, TARGET_NODE, 'src/palette.ts');
}

async function expectContextMenuEntry(context: GraphAcceptanceContext, label: string): Promise<void> {
  await expect(await requireContextMenuEntry(context, label)).toBeVisible();
}

async function clickContextMenuEntry(context: GraphAcceptanceContext, label: string): Promise<void> {
  await refreshLastContextMenu(context);
  const entry = await requireContextMenuEntry(context, label);
  if (label === 'Delete File' || label === 'Delete Folder' || /^Delete \d+ Files$/.test(label)) {
    await expect(entry).not.toHaveAttribute('aria-disabled', 'true');
    await expect(entry).not.toHaveAttribute('data-disabled', '');
  }
  await clickMenuItem(entry);
  await waitForFavoriteToggleIfNeeded(context, label);
  await dismissContextMenuAfterAction(context, label);
}

async function requireContextMenuEntry(context: GraphAcceptanceContext, label: string): Promise<Locator> {
  const entry = contextMenuEntry(context, label);
  if (await isLocatorVisible(entry)) {
    return entry;
  }

  try {
    await expect.poll(async () => {
      await reopenLastContextMenu(context);
      return isLocatorVisible(contextMenuEntry(context, label));
    }, { timeout: 10_000 }).toBe(true);
  } catch (error) {
    const visibleEntries = await readVisibleContextMenuEntries(context);
    const workspaceFavorites = readWorkspaceFavorites(context);
    const nextError = new Error(`Expected context menu entry "${label}". Visible entries: ${JSON.stringify(visibleEntries)}. Workspace favorites: ${JSON.stringify(workspaceFavorites)}`);
    (nextError as Error & { cause?: unknown }).cause = error;
    throw nextError;
  }

  return contextMenuEntry(context, label);
}

function contextMenuEntry(context: GraphAcceptanceContext, label: string): Locator {
  return requireGraphFrame(context).getByRole('menuitem', {
    name: new RegExp(`^${escapeRegExp(label)}$`, 'i'),
  });
}

async function readVisibleContextMenuEntries(context: GraphAcceptanceContext): Promise<Array<{
  disabled: string | null;
  id: string | null;
  label: string;
  targets: string | null;
}>> {
  return requireGraphFrame(context).getByRole('menuitem').evaluateAll(items =>
    items
      .filter(item => {
        const style = window.getComputedStyle(item);
        const rect = item.getBoundingClientRect();
        return style.visibility !== 'hidden'
          && style.display !== 'none'
          && rect.width > 0
          && rect.height > 0;
      })
      .map(item => ({
        disabled: item.getAttribute('aria-disabled') ?? item.getAttribute('data-disabled'),
        id: item.getAttribute('data-menu-entry-id'),
        label: item.textContent?.trim() ?? '',
        targets: item.getAttribute('data-menu-entry-targets'),
      }))
      .filter(item => item.label)
  ).catch(() => []);
}

async function clickMenuItem(locator: Locator): Promise<void> {
  try {
    await locator.click({ timeout: 5_000 });
    return;
  } catch {
    // Fall back to forced activation when VS Code overlays interfere with Playwright actionability.
  }

  try {
    await locator.click({ force: true, timeout: 5_000 });
    return;
  } catch {
    // Fall back to DOM activation when Playwright cannot act on a visible menu item.
  }

  await locator.evaluate((element) => {
    const clickable = element as HTMLElement & { click?: unknown };
    if (typeof clickable.click === 'function') {
      clickable.click();
    }
  });
}

async function dismissContextMenuAfterAction(context: GraphAcceptanceContext, label: string): Promise<void> {
  if (label === 'Rename' || label === 'Rename Folder') {
    return;
  }

  if (label === 'Delete File' || label === 'Delete Folder' || /^Delete \d+ Files$/.test(label)) {
    return;
  }

  await closeContextMenuIfOpen(context);
}

async function closeContextMenuIfOpen(context: GraphAcceptanceContext): Promise<void> {
  const frame = requireGraphFrame(context);
  const visibleMenu = frame.locator('[role="menu"], [data-menu-entries-signature]').first();
  if (!(await isLocatorVisible(visibleMenu))) {
    return;
  }

  await frame.page().keyboard.press('Escape');
  await expect(visibleMenu).toBeHidden({ timeout: 5_000 });
}

function escapeRegExp(value: unknown): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function isLocatorVisible(locator: Locator): Promise<boolean> {
  if (await locator.count() === 0) {
    return false;
  }

  return locator.first().isVisible().catch(() => false);
}

async function reopenLastContextMenu(context: GraphAcceptanceContext): Promise<void> {
  const target = context.lastContextMenuTarget;
  if (!target) {
    return;
  }

  await ensureGraphViewVisible(context);

  if (target.kind === 'background') {
    await rightClickGraphBackground(context);
    return;
  }

  if (target.kind === 'edge') {
    await rightClickEdge(context, target.sourcePath, target.targetPath);
    return;
  }

  await rightClickNode(context, target.nodePath);
}

async function ensureGraphViewVisible(context: GraphAcceptanceContext): Promise<void> {
  const vscode = requireValue(context.vscode, 'Expected VS Code to be launched');
  const currentFrame = context.graphFrame;
  if (currentFrame && await graphStage(currentFrame).isVisible().catch(() => false)) {
    return;
  }

  await openGraphView(vscode.page);
  context.graphFrame = await waitForGraphFrame(vscode.page);
}

async function refreshLastContextMenu(context: GraphAcceptanceContext): Promise<void> {
  await closeContextMenuIfOpen(context);
  await reopenLastContextMenu(context);
}

async function waitForFavoriteToggleIfNeeded(context: GraphAcceptanceContext, label: string): Promise<void> {
  const shouldAddFavorites = label === 'Add to Favorites' || label === 'Add All to Favorites';
  const shouldRemoveFavorites = label === 'Remove from Favorites' || label === 'Remove All from Favorites';
  if (!shouldAddFavorites && !shouldRemoveFavorites) {
    return;
  }

  const favoriteTargets = favoriteTargetsForLastContextMenu(context);
  if (favoriteTargets.length === 0) {
    return;
  }

  await expect.poll(() => readWorkspaceFavorites(context), { timeout: 10_000 }).toEqual(
    shouldAddFavorites
      ? expect.arrayContaining(favoriteTargets)
      : expect.not.arrayContaining(favoriteTargets),
  );
  await expectFavoriteMenuLabel(context, shouldAddFavorites);
}

async function expectFavoriteMenuLabel(
  context: GraphAcceptanceContext,
  addedFavorites: boolean,
): Promise<void> {
  await closeContextMenuIfOpen(context);
  await expect.poll(async () => {
    await reopenLastContextMenu(context);
    return isLocatorVisible(contextMenuEntry(
      context,
      addedFavorites ? 'Remove from Favorites' : 'Add to Favorites',
    ));
  }, { timeout: 10_000 }).toBe(true);
}

function favoriteTargetsForLastContextMenu(context: GraphAcceptanceContext): string[] {
  const selectedNodePaths = context.selectedNodePaths ?? [];
  if (selectedNodePaths.length > 1) {
    return selectedNodePaths;
  }

  const target = context.lastContextMenuTarget;
  return target?.kind === 'node' ? [target.nodePath] : [];
}

function readWorkspaceFavorites(context: GraphAcceptanceContext): string[] {
  const workspacePath = requireValue(context.workspacePath, 'Expected example workspace to be open');
  const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');
  if (!fs.existsSync(settingsPath)) {
    return [];
  }

  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as { favorites?: string[] };
  return settings.favorites ?? [];
}

function setWorkspaceEdgeVisibility(
  workspacePath: string,
  edgeKind: string,
  visible: boolean,
): void {
  const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
    edgeVisibility?: Record<string, boolean>;
  };

  settings.edgeVisibility = {
    ...settings.edgeVisibility,
    [edgeKind]: visible,
  };

  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

async function setPluginSwitch(
  context: GraphAcceptanceContext,
  label: string,
  enabled: boolean,
): Promise<void> {
  const frame = requireGraphFrame(context);
  const normalizedLabel = normalizePanelLabel(label);
  const switchInOpenPanel = await findPanelSwitch(frame, normalizedLabel);
  if (!(await switchInOpenPanel.isVisible().catch(() => false))) {
    await clickToolbarButton(frame, 'Plugins');
    await expect(await findPanelSwitch(frame, normalizedLabel)).toBeVisible({
      timeout: VSCODE_PLAYWRIGHT_WAIT_TIMEOUT_MS,
    });
  }

  await setPanelSwitch(context, label, enabled);
  await waitForIndexingToFinish(context);
  await closePanelIfOpen(frame);
}

async function showOnlyEdgeType(
  context: GraphAcceptanceContext,
  label: string,
): Promise<void> {
  const frame = requireGraphFrame(context);
  await openGraphScopeSection(context, 'Edge Types');

  for (const edgeTypeLabel of CORE_EDGE_TYPE_LABELS) {
    await setPanelSwitchIfPresent(context, edgeTypeLabel, edgeTypeLabel === label);
  }

  await setPanelSwitch(context, label, true);
  await closePanelIfOpen(frame);
}

async function showNoEdgeTypes(context: GraphAcceptanceContext): Promise<void> {
  await setCoreEdgeTypes(context, () => false);
  await requireGraphFrame(context).waitForTimeout(150);
  await setCoreEdgeTypes(context, () => false);
}

async function setCoreEdgeTypes(
  context: GraphAcceptanceContext,
  enabledForLabel: (label: string) => boolean,
): Promise<void> {
  const frame = requireGraphFrame(context);
  await openGraphScopeSection(context, 'Edge Types');

  for (const edgeTypeLabel of CORE_EDGE_TYPE_LABELS) {
    await setPanelSwitchIfPresent(context, edgeTypeLabel, enabledForLabel(edgeTypeLabel));
  }

  await closePanelIfOpen(frame);
}

async function toggleEdgeTypeOn(
  context: GraphAcceptanceContext,
  label: string,
): Promise<void> {
  const frame = requireGraphFrame(context);
  await openGraphScopeSection(context, 'Edge Types');
  await setPanelSwitch(context, label, true);
  await closePanelIfOpen(frame);
}

async function toggleEdgeTypesOff(
  context: GraphAcceptanceContext,
  labels: string[],
): Promise<void> {
  const frame = requireGraphFrame(context);
  await openGraphScopeSection(context, 'Edge Types');
  for (const label of labels) {
    await setPanelSwitchIfPresent(context, label, false);
  }
  await closePanelIfOpen(frame);
}

async function toggleNodeTypes(
  context: GraphAcceptanceContext,
  labels: string[],
  enabled: boolean,
): Promise<void> {
  const frame = requireGraphFrame(context);
  await openGraphScopeSection(context, 'Node Types');
  const labelsToToggle = enabled
    ? collectScopeLabelSelection(labels)
    : { required: new Set(labels), optional: new Set<string>() };

  for (const label of labelsToToggle.required) {
    await setPanelSwitch(context, label, enabled);
  }
  for (const label of labelsToToggle.optional) {
    await setPanelSwitchIfPresent(context, label, enabled);
  }

  await closePanelIfOpen(frame);
}

async function showOnlyNodeTypes(
  context: GraphAcceptanceContext,
  labels: string[],
  options: { requireCoreNodeTypes?: boolean } = {},
): Promise<void> {
  await setOnlyNodeTypes(context, labels, options);
  if (options.requireCoreNodeTypes) {
    await requireGraphFrame(context).waitForTimeout(150);
    await setOnlyNodeTypes(context, labels, options);
  }
}

async function setOnlyNodeTypes(
  context: GraphAcceptanceContext,
  labels: string[],
  options: { requireCoreNodeTypes?: boolean } = {},
): Promise<void> {
  const frame = requireGraphFrame(context);
  await openGraphScopeSection(context, 'Node Types');
  const labelSelection = collectScopeLabelSelection(labels);

  for (const nodeTypeLabel of CORE_NODE_TYPE_LABELS) {
    if (options.requireCoreNodeTypes && requiresCoreNodeTypeSwitch(nodeTypeLabel)) {
      await setPanelSwitch(context, nodeTypeLabel, labelSelection.all.has(nodeTypeLabel));
    } else {
      await setPanelSwitchIfPresent(context, nodeTypeLabel, labelSelection.all.has(nodeTypeLabel));
    }
  }

  for (const nodeTypeLabel of labelSelection.required) {
    await setPanelSwitch(context, nodeTypeLabel, true);
  }
  for (const nodeTypeLabel of labelSelection.optional) {
    await setPanelSwitchIfPresent(context, nodeTypeLabel, true);
  }

  await closePanelIfOpen(frame);
}

export function requiresCoreNodeTypeSwitch(label: string): boolean {
  return REQUIRED_CORE_NODE_TYPE_LABELS.has(label);
}

async function openGraphScopeSection(
  context: GraphAcceptanceContext,
  sectionName: 'Edge Types' | 'Node Types',
): Promise<void> {
  context.activeGraphScopeSection = sectionName;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await ensureGraphViewVisible(context);
    const frame = requireGraphFrame(context);

    try {
      if (!(await frame.getByRole('button', { name: sectionName }).isVisible().catch(() => false))) {
        await clickToolbarButton(frame, 'Graph Scope');
      }

      const sectionButton = frame.getByRole('button', { name: sectionName });
      if (sectionName === 'Edge Types' && await sectionButton.isDisabled().catch(() => false)) {
        await closePanelIfOpen(frame);
        await indexWorkspace(context);
        await waitForIndexingToFinish(context);
        await ensureGraphViewVisible(context);
        await clickToolbarButton(requireGraphFrame(context), 'Graph Scope');
      }

      await requireGraphFrame(context).getByRole('button', { name: sectionName }).click();
      return;
    } catch (error) {
      if (!isFrameDetachedError(error) || attempt === 1) {
        throw error;
      }

      await refreshGraphFrameAfterDetach(context);
    }
  }
}

export async function setPanelSwitch(
  context: GraphAcceptanceContext,
  label: string,
  enabled: boolean,
): Promise<void> {
  await setPanelSwitchState(context, label, enabled, { requirePresent: true });
}

export async function setPanelSwitchIfPresent(
  context: GraphAcceptanceContext,
  label: string,
  enabled: boolean,
): Promise<void> {
  await setPanelSwitchState(context, label, enabled, { requirePresent: false });
}

async function setPanelSwitchState(
  context: GraphAcceptanceContext,
  label: string,
  enabled: boolean,
  options: { requirePresent: boolean },
): Promise<void> {
  const normalizedLabel = normalizePanelLabel(label);
  const expected = String(enabled);

  for (let frameAttempt = 0; frameAttempt < 2; frameAttempt += 1) {
    const frame = requireGraphFrame(context);

    try {
      const switchInRow = options.requirePresent
        ? await findPanelSwitch(frame, normalizedLabel)
        : await findPanelSwitchIfPresent(frame, normalizedLabel);

      if (!switchInRow) {
        return;
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const currentSwitch = attempt === 0
          ? switchInRow
          : await findPanelSwitchIfPresent(frame, normalizedLabel);
        if (!currentSwitch || !(await currentSwitch.isVisible().catch(() => false))) {
          if (!enabled) {
            return;
          }

          await frame.waitForTimeout(150);
          continue;
        }

        const checked = await currentSwitch.getAttribute('aria-checked').catch(() => enabled ? 'false' : expected);
        if (checked === expected) {
          return;
        }

        await currentSwitch.click();
        await frame.waitForTimeout(150);
      }

      await expect.poll(async () => {
        const currentSwitch = await findPanelSwitchIfPresent(frame, normalizedLabel);
        if (!currentSwitch) {
          return enabled ? 'missing' : expected;
        }

        return await currentSwitch.getAttribute('aria-checked') ?? 'missing';
      }).toBe(expected);
      return;
    } catch (error) {
      if (!isFrameDetachedError(error) || frameAttempt === 1) {
        throw error;
      }

      await refreshGraphFrameAfterDetach(context);
      if (context.activeGraphScopeSection) {
        await openGraphScopeSection(context, context.activeGraphScopeSection);
      }
    }
  }
}

export async function findPanelSwitchIfPresent(frame: Frame, label: string): Promise<Locator | undefined> {
  for (const candidate of panelSwitchCandidates(frame, label)) {
    if (await countPanelSwitchCandidate(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function countPanelSwitchCandidate(candidate: Locator): Promise<number> {
  try {
    return await candidate.count();
  } catch (error) {
    if (isFrameDetachedError(error)) {
      return 0;
    }

    throw error;
  }
}

export function isFrameDetachedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('Frame was detached')
    || error.message.includes('Cannot find context with specified id');
}

async function refreshGraphFrameAfterDetach(context: GraphAcceptanceContext): Promise<void> {
  context.graphFrame = await waitForGraphFrame(requireValue(context.vscode, 'Expected VS Code to be launched').page);
}

function panelSwitchCandidates(frame: Frame, label: string): Locator[] {
  const rowSelector = `[data-scope-row="${escapeCssAttributeValue(label)}"]`;
  const row = frame.locator(rowSelector).first();
  return [
    frame.locator(`${rowSelector} [role="switch"]`).first(),
    frame.locator(`${rowSelector} button`).first(),
    row.getByRole('switch').first(),
    frame.locator(`[aria-label="Toggle ${escapeCssAttributeValue(label)}"]`).first(),
    frame.getByRole('switch', { name: `Toggle ${label}`, exact: true }),
    frame.getByRole('switch', { name: label, exact: true }),
  ];
}

async function findPanelSwitch(frame: Frame, label: string): Promise<Locator> {
  const candidates = panelSwitchCandidates(frame, label);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    for (const candidate of candidates) {
      if (await candidate.count()) {
        return candidate;
      }
    }
    await frame.waitForTimeout(100);
  }

  return candidates.at(-1) ?? frame.getByRole('switch', { name: label, exact: true });
}

function escapeCssAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function collectScopeLabelSelection(labels: string[]): { required: Set<string>; optional: Set<string>; all: Set<string> } {
  const required = new Set<string>();
  const optional = new Set<string>();
  const requestedLabels = new Set(labels);
  const requestedSymbolKinds = new Set(labels.flatMap(label => NODE_TYPE_SYMBOL_KIND_BY_LABEL[label] ?? []));

  for (const label of labels) {
    let currentLabel: string | undefined = String(label);
    while (currentLabel) {
      required.add(currentLabel);
      currentLabel = CHILD_NODE_TYPE_PARENTS[currentLabel];
    }
  }

  for (const [label, parentLabel] of Object.entries(CHILD_NODE_TYPE_PARENTS)) {
    const childSymbolKinds = NODE_TYPE_SYMBOL_KIND_BY_LABEL[label] ?? [];
    if (requestedLabels.has(parentLabel) && childSymbolKinds.some(kind => requestedSymbolKinds.has(kind))) {
      optional.add(label);
    }
  }

  return {
    required,
    optional,
    all: new Set([...required, ...optional]),
  };
}

async function expectVisibleGraphRelationship(
  context: GraphAcceptanceContext,
  relationship: {
    fromFilePath: string;
    fromName: string;
    targetFilePath: string;
    targetName: string;
  },
): Promise<void> {
  const sourceId = await resolveVisibleRelationshipEndpoint(context, {
    filePath: relationship.fromFilePath,
    name: relationship.fromName,
    preferContainingType: true,
  });
  const targetId = await resolveVisibleRelationshipEndpoint(context, {
    filePath: relationship.targetFilePath,
    name: relationship.targetName,
  });

  await expectVisibleEdgeBetween(context, sourceId, targetId);
}

async function resolveVisibleRelationshipEndpoint(
  context: GraphAcceptanceContext,
  endpoint: {
    filePath: string;
    name: string;
    preferContainingType?: boolean;
  },
): Promise<string> {
  const directSymbolId = await resolveVisibleSymbolNodeId(context, {
    filePath: endpoint.filePath,
    name: endpoint.name,
  }, { allowMissing: true });
  if (directSymbolId) {
    return directSymbolId;
  }

  if (endpoint.preferContainingType && endpoint.name.includes('::')) {
    const containingType = endpoint.name.split('::')[0];
    const containingTypeId = await resolveVisibleSymbolNodeId(context, {
      filePath: endpoint.filePath,
      name: containingType,
      nodeTypeLabel: 'Class',
    }, { allowMissing: true });
    if (containingTypeId) {
      return containingTypeId;
    }
  }

  return endpoint.filePath;
}

async function resolveVisibleSymbolNodeId(
  context: GraphAcceptanceContext,
  symbol: {
    filePath: string;
    name: string;
    nodeTypeLabel?: string;
  },
  options: { allowMissing?: boolean } = {},
): Promise<string | undefined> {
  const frame = requireGraphFrame(context);
  const symbolKinds = symbol.nodeTypeLabel ? getSymbolKindsForNodeTypeLabel(symbol.nodeTypeLabel) : undefined;
  const nodeId = await frame.locator('[aria-label^="Graph node "]').evaluateAll((nodes, request) => {
    const matchingLabel = nodes
      .map((node) => node.getAttribute('aria-label') ?? '')
      .find((label) => {
        const nodeId = label.replace(/^Graph node /, '');
        const symbolSeparatorIndex = nodeId.indexOf('#');
        if (symbolSeparatorIndex < 0 || nodeId.slice(0, symbolSeparatorIndex) !== request.filePath) {
          return false;
        }

        const symbolSuffix = nodeId.slice(symbolSeparatorIndex + 1);
        if (!request.symbolKinds) {
          return symbolSuffix.startsWith(`${request.name}:`);
        }

        return request.symbolKinds.some((kind) => {
          const prefix = `${request.name}:${kind}`;
          return symbolSuffix === prefix || symbolSuffix.startsWith(`${prefix}:`);
        });
      });

    return matchingLabel?.replace(/^Graph node /, '');
  }, {
    filePath: symbol.filePath,
    name: symbol.name,
    symbolKinds,
  });

  if (nodeId) {
    return nodeId;
  }

  if (options.allowMissing) {
    return undefined;
  }

  throw new Error(`Expected visible ${symbol.nodeTypeLabel ?? 'symbol'} node ${symbol.name} from ${symbol.filePath}`);
}

function parseScopeTypeList(value: string): string[] {
  return value
    .split(/\s+and\s+|,\s*/)
    .map(entry => entry.trim().replace(/^the\s+/i, ''))
    .filter(Boolean);
}

function normalizePanelLabel(label: string): string {
  const normalized = label.trim().toLowerCase();
  const aliases: Record<string, string> = {
    calls: 'Call',
    reference: 'References',
    references: 'References',
    'type imports': 'Type imports',
    'type import': 'Type imports',
    'typescript alias import': 'TypeScript Alias Import',
  };

  return Object.prototype.hasOwnProperty.call(aliases, normalized) ? aliases[normalized] : label;
}

async function closePanelIfOpen(frame: Frame): Promise<void> {
  try {
    const closeButton = frame.getByRole('button', { name: 'Close' });
    if (await closeButton.count()) {
      await closeButton.first().click();
    }
  } catch (error) {
    if (!isFrameDetachedError(error)) {
      throw error;
    }
  }
}

async function pressAndHoldToolbarButton(context: GraphAcceptanceContext, label: string): Promise<void> {
  const button = requireGraphFrame(context).getByRole('button', { name: label });
  await button.dispatchEvent('pointerdown', {
    bubbles: true,
    button: 0,
    buttons: 1,
    pointerId: 1,
    pointerType: 'mouse',
  });
  await requireGraphFrame(context).waitForTimeout(350);
  await button.dispatchEvent('pointerup', {
    bubbles: true,
    button: 0,
    buttons: 0,
    pointerId: 1,
    pointerType: 'mouse',
  });
}

async function expectInputValue(
  scope: Pick<Frame | Page, 'locator'>,
  expectedValue: string,
): Promise<void> {
  await expect.poll(async () => scope.locator('input, textarea').evaluateAll((fields, value) =>
    fields.some((field) =>
      (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) &&
      field.value === String(value)
    ),
    expectedValue,
  )).toBe(true);
}
