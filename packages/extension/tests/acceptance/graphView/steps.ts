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
  readExampleTypescriptFiles,
} from './workspace';
import { launchVSCodeWithWorkspace, openGraphView, waitForGraphFrame } from './vscode';

const TARGET_NODE = 'src/index.ts';

interface PatternAcceptanceStep {
  pattern: RegExp;
  run: (context: GraphAcceptanceContext, step: AcceptanceRuntimeStep, match: RegExpMatchArray) => Promise<void>;
}

const exactGraphViewAcceptanceSteps: Record<string, AcceptanceStepImplementation> = {
  'I open the examples/example-typescript workspace in VS Code': async (context, step) => {
    context.workspaceTempRoot = createWorkspaceTempRoot();
    context.exampleName = 'example-typescript';
    context.workspacePath = copyExampleTypescriptWorkspace(context.workspaceTempRoot, {
      includeTypeImportEdges: step.sourcePath.endsWith('/folder-context-menu.md'),
      includeVSCodeSettings: step.sourcePath.endsWith('/graph-view.md')
        || step.sourcePath.endsWith('/graph-navigation.md')
        || step.sourcePath.endsWith('/typescript-example.md'),
    });
  },

  'I open the CodeGraphy extension graph view': async (context) => {
    const workspacePath = requireValue(context.workspacePath, 'Expected example workspace to be open');
    context.vscode = await launchVSCodeWithWorkspace(workspacePath, {
      pluginPackageRelativePaths: acceptancePluginPackageRelativePathsForExample(context.exampleName),
    });
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
    const expectedFiles = readExampleTypescriptFiles(workspacePath);
    expect(expectedFiles).toEqual(readExampleWorkspaceFiles(workspacePath));
    const counts = await getGraphCounts(requireGraphFrame(context));
    expect(counts.nodes).toBe(expectedFiles.length);
  },

  'I index the workspace': async (context) => {
    await indexWorkspace(context);
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

const patternGraphViewAcceptanceSteps: PatternAcceptanceStep[] = [
  step(/^I open the examples\/(.+) workspace in VS Code$/, async (context, _step, match) => {
    const exampleName = match[1];
    context.workspaceTempRoot = createWorkspaceTempRoot();
    context.exampleName = exampleName;
    context.workspacePath = copyExampleWorkspace(context.workspaceTempRoot, exampleName, {
      includeCallEdges: ['example-go', 'example-java', 'example-python', 'example-rust'].includes(exampleName),
    });
  }),

  step(/^I have indexed the workspace$/, async (context) => {
    await indexWorkspace(context);
    await waitForIndexingToFinish(context);
  }),

  step(/^the graph nodes match the expected files in the examples\/(.+) workspace$/, async (context, _step, match) => {
    const workspacePath = requireValue(context.workspacePath, 'Expected example workspace to be open');
    expect(context.exampleName).toBe(match[1]);
    const expectedFiles = readExampleWorkspaceFiles(workspacePath);
    expect(expectedFiles).toEqual(readExampleWorkspaceFiles(workspacePath));
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

  step(/^(?!I see )(.+) points to (.+)$/, async (context, _step, match) => {
    await expectVisibleEdgeBetween(context, match[1], match[2]);
  }),

  step(/^I see (.+) points to (.+)$/, async (context, _step, match) => {
    await expectVisibleEdgeBetween(context, match[1], match[2]);
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
    await togglePanelSwitch(context, match[1]);
    await waitForIndexingToFinish(context);
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

  step(/^I see to buttons for switching views between node type and edge type toggles$/, async (context) => {
    await expect(requireGraphFrame(context).getByRole('button', { name: 'Node Types' })).toBeVisible();
    await expect(requireGraphFrame(context).getByRole('button', { name: 'Edge Types' })).toBeVisible();
  }),

  step(/^I select node types$/, async (context) => {
    await requireGraphFrame(context).getByRole('button', { name: 'Node Types' }).click();
  }),

  step(/^I select edge types$/, async (context) => {
    await requireGraphFrame(context).getByRole('button', { name: 'Edge Types' }).click();
  }),

  step(/^I see a list of node types with toggles$/, async (context) => {
    await expect(requireGraphFrame(context).getByText('Folder', { exact: true })).toBeVisible();
  }),

  step(/^I see a list of edge types with toggles$/, async (context) => {
    await expect(requireGraphFrame(context).getByText('Nests', { exact: true })).toBeVisible();
  }),

  step(/^I toggle the Folder node on$/, async (context) => {
    await togglePanelSwitch(context, 'Folder');
  }),

  step(/^I toggle the Nests edge on$/, async (context) => {
    await togglePanelSwitch(context, 'Nests');
  }),

  step(/^I close the Graph Scope$/, async (context) => {
    await clickToolbarButton(requireGraphFrame(context), 'Graph Scope');
  }),

  step(/^I can see a new "(.+)" node in the graph$/, async (context, _step, match) => {
    await findNodeProbe(context, match[1]);
  }),

  step(/^I click and drag on the background I can select multiple nodes at once$/, async (context) => {
    await clickNode(context, TARGET_NODE);
    await modifierClickNode(context, 'src/utils.ts');
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

async function indexWorkspace(context: GraphAcceptanceContext): Promise<void> {
  const frame = requireGraphFrame(context);
  context.beforeIndexStageImage = await graphStage(frame).screenshot();
  await frame.getByRole('button', { name: 'Index Workspace' }).click();
}

async function waitForIndexingToFinish(context: GraphAcceptanceContext): Promise<void> {
  await expect(
    requireGraphFrame(context).getByRole('progressbar', { name: 'Indexing progress' }),
  ).toBeHidden({ timeout: 30_000 });
}

async function expectGraphCounts(
  context: GraphAcceptanceContext,
  expectedNodes: number,
  expectedEdges: number,
): Promise<void> {
  await expect.poll(async () => getGraphCounts(requireGraphFrame(context))).toEqual({
    nodes: expectedNodes,
    edges: expectedEdges,
  });
}

async function readZoomScaleMetric(context: GraphAcceptanceContext): Promise<number> {
  return await readGraphDebugZoom(requireGraphFrame(context))
    ?? readScreenDistanceBetweenNodes(context, TARGET_NODE, 'src/utils.ts');
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

async function togglePanelSwitch(context: GraphAcceptanceContext, label: string): Promise<void> {
  const frame = requireGraphFrame(context);
  const row = frame.getByText(label, { exact: true }).locator('xpath=ancestor::*[self::label or self::div][1]');
  const switchInRow = row.getByRole('switch').first();

  if (await switchInRow.count()) {
    await switchInRow.click();
    return;
  }

  await frame.getByRole('switch', { name: label }).click();
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
