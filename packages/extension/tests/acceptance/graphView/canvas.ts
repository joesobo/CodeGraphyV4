import { expect, type Frame, type Locator, type Page } from '@playwright/test';
import type { GraphAcceptanceContext, NodeProbe, Point } from './types';
import { requireValue } from './context';

interface CanvasAnalysis {
  bluePixelCount: number;
  whiteCenterPixelCount: number;
  labelPixelCount: number;
  outlinePixelCount: number;
}

const TARGET_NODE = 'src/index.ts';
const BLUE_NODE_RGB = { red: 147, green: 197, blue: 253 };

export function requireGraphFrame(context: GraphAcceptanceContext): Frame {
  return requireValue(context.graphFrame, 'Expected Graph View frame to be open');
}

export function graphStage(frame: Frame): Locator {
  return frame.getByLabel('Graph Stage');
}

export async function countVisibleGraphPixels(frame: Frame): Promise<number> {
  return graphStage(frame).locator('canvas').last().evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) {
      return 0;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return 0;
    }

    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    let visiblePixels = 0;
    for (let index = 3; index < image.data.length; index += 4) {
      if (image.data[index] > 0) {
        visiblePixels += 1;
      }
    }

    return visiblePixels;
  });
}

export async function getGraphCounts(frame: Frame): Promise<{ nodes: number; edges: number }> {
  const text = await frame.locator('body').innerText();
  const match = text.match(/(\d+)\s+nodes\s+•\s+(\d+)\s+(?:edges|connections?)/);
  if (!match) {
    throw new Error(`Expected graph count text in webview, saw:\n${text}`);
  }

  return {
    nodes: Number(match[1]),
    edges: Number(match[2]),
  };
}

export function countChangedBytes(previous: Buffer, next: Buffer): number {
  const length = Math.min(previous.length, next.length);
  let changed = Math.abs(previous.length - next.length);

  for (let index = 0; index < length; index += 1) {
    if (previous[index] !== next[index]) {
      changed += 1;
    }
  }

  return changed;
}

export function distanceBetween(previous: Point, next: Point): number {
  return Math.hypot(next.x - previous.x, next.y - previous.y);
}

export async function findNodeProbe(
  context: GraphAcceptanceContext,
  nodePath: string,
): Promise<NodeProbe> {
  const frame = requireGraphFrame(context);
  await clickFitToScreenIfAvailable(frame);
  const probe = await waitForStableNodeProbe(frame, nodePath);
  context.nodeProbes.set(nodePath, probe);
  return probe;
}

export async function clickFitToScreenIfAvailable(frame: Frame): Promise<void> {
  const fitByRole = frame.getByRole('button', { name: 'Fit to Screen' });
  if (await fitByRole.count()) {
    await clickElement(fitByRole);
    return;
  }

  const fitByTitle = frame.getByTitle('Fit to Screen');
  if (await fitByTitle.count()) {
    await clickElement(fitByTitle);
  }
}

async function clickElement(locator: Locator): Promise<void> {
  await locator.evaluate((element) => {
    const clickable = element as HTMLElement & { click?: unknown };
    if (typeof clickable.click === 'function') {
      clickable.click();
    }
  });
}

async function waitForStableNodeProbe(frame: Frame, nodePath: string): Promise<NodeProbe> {
  let previous = await readNodeProbe(frame, nodePath);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await frame.waitForTimeout(100);
    const next = await readNodeProbe(frame, nodePath);
    if (distanceBetween(previous.center, next.center) < 2) {
      return next;
    }
    previous = next;
  }

  return previous;
}

export function graphNode(frame: Frame, nodePath: string): Locator {
  return frame.getByLabel(`Graph node ${nodePath}`, { exact: true });
}

export async function graphNodeByExactPathOrBasename(frame: Frame, nodePath: string): Promise<Locator> {
  const exactNode = graphNode(frame, nodePath);
  if (await exactNode.count() > 0) {
    return exactNode;
  }

  const matchingLabel = await frame.locator('[aria-label^="Graph node "]').evaluateAll((items, requestedPath) => {
    const requested = String(requestedPath);
    return items
      .map(item => item.getAttribute('aria-label') ?? '')
      .find((label) => {
        const nodeId = label.replace(/^Graph node /, '');
        return nodeId.split('/').at(-1) === requested;
      });
  }, nodePath);

  if (matchingLabel) {
    return frame.getByLabel(matchingLabel, { exact: true });
  }

  return exactNode;
}

export function graphEdge(frame: Frame, sourcePath: string, targetPath: string): Locator {
  return frame.getByLabel(`Graph edge ${sourcePath} to ${targetPath}`, { exact: true }).first();
}

export async function clickToolbarButton(frame: Frame, name: string): Promise<void> {
  await frame.getByTitle(name).click({ force: true });
}

async function readNodeProbe(frame: Frame, nodePath: string): Promise<NodeProbe> {
  const debugProbe = await readDebugNodeProbe(frame, nodePath);
  if (debugProbe) {
    return debugProbe;
  }

  const nodeLocator = await graphNodeByExactPathOrBasename(frame, nodePath);
  await expect(nodeLocator).toBeAttached({ timeout: 10_000 });

  const nodeBox = await nodeLocator.boundingBox();
  const stageBox = await graphStage(frame).boundingBox();
  if (!nodeBox || !stageBox) {
    throw new Error(`Expected an accessibility position for ${nodePath}`);
  }

  return {
    path: nodePath,
    center: {
      x: Math.round((nodeBox.x - stageBox.x) + (nodeBox.width / 2)),
      y: Math.round((nodeBox.y - stageBox.y) + (nodeBox.height / 2)),
    },
    radius: Math.round(Math.max(nodeBox.width, nodeBox.height) / 2),
  };
}

async function readDebugNodeProbe(frame: Frame, nodePath: string): Promise<NodeProbe | null> {
  return frame.evaluate((path) => {
    const debug = window.__CODEGRAPHY_GRAPH_DEBUG__;
    const snapshot = debug?.getSnapshot();
    const node = snapshot?.nodes.find(entry => entry.id === path);

    if (!node) {
      return null;
    }

    return {
      path,
      center: {
        x: Math.round(node.screenX),
        y: Math.round(node.screenY),
      },
      radius: Math.round(node.size / 2),
    };
  }, nodePath);
}

async function dragMouseBetweenStagePoints(frame: Frame, source: Point, target: Point): Promise<void> {
  const stage = graphStage(frame);
  const page = frame.page();
  await stage.hover({ position: source, timeout: 1_000 });
  await page.mouse.down();
  await frame.waitForTimeout(100);
  await stage.hover({ position: target, timeout: 1_000 });
  await frame.waitForTimeout(100);
  await page.mouse.up();
}

async function dispatchCanvasDragBetweenStagePoints(frame: Frame, source: Point, target: Point): Promise<void> {
  await graphStage(frame).evaluate((stage, options) => {
    const canvases = stage.querySelectorAll('canvas');
    const canvas = canvases.item(canvases.length - 1);
    if (!(stage instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Expected Graph Stage to contain a canvas');
    }

    const stageRect = stage.getBoundingClientRect();
    const toClient = (point: Point): Point => ({
      x: stageRect.left + point.x,
      y: stageRect.top + point.y,
    });
    const dispatchMouse = (type: string, point: Point, buttons: number): void => {
      const client = toClient(point);
      canvas.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        button: 0,
        buttons,
        cancelable: true,
        clientX: client.x,
        clientY: client.y,
      }));
    };

    dispatchMouse('mousedown', options.source, 1);
    for (let step = 1; step <= 12; step += 1) {
      dispatchMouse('mousemove', {
        x: options.source.x + (((options.target.x - options.source.x) * step) / 12),
        y: options.source.y + (((options.target.y - options.source.y) * step) / 12),
      }, 1);
    }
    dispatchMouse('mouseup', options.target, 0);
  }, { source, target });
}

export async function hoverNode(context: GraphAcceptanceContext, nodePath: string): Promise<NodeProbe> {
  const frame = requireGraphFrame(context);
  const probe = await findNodeProbe(context, nodePath);
  const tooltipPath = frame.getByText(nodePath, { exact: true }).first();

  const stageBox = await graphStage(frame).boundingBox();
  if (!stageBox) throw new Error('Expected Graph Stage to have a bounding box');
  await frame.page().mouse.move(stageBox.x + probe.center.x, stageBox.y + probe.center.y);
  await expect(tooltipPath).toBeVisible({ timeout: 10_000 });
  return probe;
}

export async function stopHoverNode(context: GraphAcceptanceContext, nodePath: string): Promise<void> {
  const frame = requireGraphFrame(context);
  const stageBox = await graphStage(frame).boundingBox();
  if (!stageBox) throw new Error('Expected Graph Stage to have a bounding box');
  await frame.page().mouse.move(stageBox.x + 4, stageBox.y + 4);
}

export async function hoverEdge(
  context: GraphAcceptanceContext,
  sourcePath: string,
  targetPath: string,
): Promise<void> {
  const frame = requireGraphFrame(context);
  const source = await findNodeProbe(context, sourcePath);
  const target = await findNodeProbe(context, targetPath);
  const stageBox = await graphStage(frame).boundingBox();
  if (!stageBox) throw new Error('Expected Graph Stage to have a bounding box');
  await frame.page().mouse.move(
    stageBox.x + (source.center.x + target.center.x) / 2,
    stageBox.y + (source.center.y + target.center.y) / 2,
  );
  await expect(frame.getByTestId('graph-edge-tooltip')).toBeVisible();
}

export async function clickNode(context: GraphAcceptanceContext, nodePath: string): Promise<void> {
  const frame = requireGraphFrame(context);
  await findNodeProbe(context, nodePath);
  await graphNode(frame, nodePath).dispatchEvent('click', { bubbles: true });
  context.selectedNodePaths = [nodePath];
}

export async function modifierClickNode(context: GraphAcceptanceContext, nodePath: string): Promise<void> {
  const frame = requireGraphFrame(context);
  await findNodeProbe(context, nodePath);
  await graphNode(frame, nodePath).dispatchEvent('click', { bubbles: true, shiftKey: true });
  const selectedNodePaths = context.selectedNodePaths ?? [];
  context.selectedNodePaths = selectedNodePaths.includes(nodePath)
    ? selectedNodePaths.filter(selectedPath => selectedPath !== nodePath)
    : [...selectedNodePaths, nodePath];
}

export async function doubleClickNode(context: GraphAcceptanceContext, nodePath: string): Promise<void> {
  const frame = requireGraphFrame(context);
  await findNodeProbe(context, nodePath);
  await graphNode(frame, nodePath).dispatchEvent('dblclick', { bubbles: true });
}

export async function rightClickNode(context: GraphAcceptanceContext, nodePath: string): Promise<void> {
  const frame = requireGraphFrame(context);
  await findNodeProbe(context, nodePath);
  context.lastContextMenuTarget = { kind: 'node', nodePath };
  await graphNode(frame, nodePath).dispatchEvent('contextmenu', { bubbles: true, button: 2 });
}

export async function clickGraphBackground(context: GraphAcceptanceContext): Promise<void> {
  const frame = requireGraphFrame(context);
  const stageBox = await graphStage(frame).boundingBox();
  if (!stageBox) {
    throw new Error('Expected Graph Stage to have a bounding box');
  }

  await frame.page().mouse.click(stageBox.x + 12, stageBox.y + 12);
  context.selectedNodePaths = [];
}

export async function rightClickGraphBackground(context: GraphAcceptanceContext): Promise<void> {
  const frame = requireGraphFrame(context);
  context.lastContextMenuTarget = { kind: 'background' };
  await graphStage(frame).evaluate((stage) => {
    const rect = stage.getBoundingClientRect();
    stage.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
      buttons: 2,
      clientX: rect.left + 24,
      clientY: rect.top + 24,
    }));
  });
}

export async function rightClickEdge(
  context: GraphAcceptanceContext,
  sourcePath: string,
  targetPath: string,
): Promise<void> {
  const frame = requireGraphFrame(context);
  await expectVisibleEdgeBetween(context, sourcePath, targetPath);
  const source = await findNodeProbe(context, sourcePath);
  const target = await findNodeProbe(context, targetPath);
  const stageBox = await graphStage(frame).boundingBox();
  if (!stageBox) throw new Error('Expected Graph Stage to have a bounding box');
  context.lastContextMenuTarget = { kind: 'edge', sourcePath, targetPath };
  await frame.page().mouse.click(
    stageBox.x + (source.center.x + target.center.x) / 2,
    stageBox.y + (source.center.y + target.center.y) / 2,
    { button: 'right' },
  );
}

export async function dragNode(context: GraphAcceptanceContext, nodePath: string): Promise<void> {
  const frame = requireGraphFrame(context);
  const probe = await findNodeProbe(context, nodePath);

  context.beforeDragCenter = probe.center;
  const targets = await chooseInStageDragTargets(frame, probe.center);
  let lastError: unknown;
  for (const target of targets) {
    try {
      await dragMouseBetweenStagePoints(frame, await readNodeProbe(frame, nodePath).then(next => next.center), target);
      context.nodeProbes.delete(nodePath);
      context.afterDragCenter = await waitForNodeCenterToMove(frame, nodePath, probe.center, 1_500);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!context.afterDragCenter) {
    await dispatchCanvasDragBetweenStagePoints(frame, probe.center, targets[0] ?? probe.center);
    context.afterDragCenter = await waitForNodeCenterToMove(frame, nodePath, probe.center).catch(() => {
      throw lastError;
    });
  }

  context.nodeProbes.set(nodePath, {
    path: nodePath,
    center: context.afterDragCenter,
    radius: probe.radius,
  });
}

async function chooseInStageDragTargets(frame: Frame, source: Point): Promise<Point[]> {
  const stageBox = await graphStage(frame).boundingBox();
  if (!stageBox) {
    throw new Error('Expected Graph Stage to have a bounding box');
  }

  const margin = 32;
  const clampTarget = (horizontalDelta: number, verticalDelta: number): Point => ({
    x: Math.max(margin, Math.min(stageBox.width - margin, source.x + horizontalDelta)),
    y: Math.max(margin, Math.min(stageBox.height - margin, source.y + verticalDelta)),
  });
  const preferredHorizontalDelta = source.x + 96 < stageBox.width - margin ? 96 : -96;
  const alternateHorizontalDelta = preferredHorizontalDelta * -1;
  const preferredVerticalDelta = source.y - 72 > margin ? -72 : 72;
  const alternateVerticalDelta = preferredVerticalDelta * -1;

  return [
    clampTarget(preferredHorizontalDelta, preferredVerticalDelta),
    clampTarget(alternateHorizontalDelta, preferredVerticalDelta),
    clampTarget(preferredHorizontalDelta, alternateVerticalDelta),
    clampTarget(alternateHorizontalDelta, alternateVerticalDelta),
  ].filter((target, index, targets) =>
    distanceBetween(source, target) > 20
    && targets.findIndex(candidate => candidate.x === target.x && candidate.y === target.y) === index,
  );
}

export async function recordDroppedNodeCenter(context: GraphAcceptanceContext): Promise<void> {
  await requireGraphFrame(context).waitForTimeout(300);
  context.dropCenter = (await readNodeProbe(requireGraphFrame(context), TARGET_NODE)).center;
}

export async function expectNodeStaysDropped(context: GraphAcceptanceContext): Promise<void> {
  const dropSettleTolerancePixels = 18;
  const dropCenter = requireValue(context.dropCenter, 'Expected a dropped node position');
  await requireGraphFrame(context).waitForTimeout(500);
  const nextCenter = await readNodeProbe(requireGraphFrame(context), TARGET_NODE);

  expect(distanceBetween(dropCenter, nextCenter.center)).toBeLessThan(dropSettleTolerancePixels);
}

export async function expectNodeLooksBlue(frame: Frame, probe: NodeProbe): Promise<void> {
  const analysis = await analyzeNodePixels(frame, probe);
  expect(analysis.bluePixelCount).toBeGreaterThan(20);
}

export async function expectNodeHasWhiteCenterSymbol(frame: Frame, probe: NodeProbe): Promise<void> {
  const analysis = await analyzeNodePixels(frame, probe);
  expect(analysis.whiteCenterPixelCount).toBeGreaterThan(8);
}

export async function expectNodeHasLabel(frame: Frame, probe: NodeProbe): Promise<void> {
  const analysis = await analyzeNodePixels(frame, probe);
  expect(analysis.labelPixelCount).toBeGreaterThan(8);
}

export async function expectNodeIsOutlined(frame: Frame, probe: NodeProbe): Promise<void> {
  await expect.poll(async () => (await analyzeNodePixels(frame, probe)).outlinePixelCount).toBeGreaterThan(10);
}

export async function expectVisibleEdgeBetween(
  context: GraphAcceptanceContext,
  sourcePath: string,
  targetPath: string,
): Promise<void> {
  const frame = requireGraphFrame(context);
  const source = await findNodeProbe(context, sourcePath);
  const target = await findNodeProbe(context, targetPath);

  await expect(graphEdge(frame, sourcePath, targetPath)).toBeAttached();
  if (sourcePath !== targetPath) {
    expect(distanceBetween(source.center, target.center)).toBeGreaterThan(0);
  }
}

export async function waitForFileOpened(page: Page, fileName: string): Promise<void> {
  await expect.poll(() => page.title(), { timeout: 10_000 }).toContain(fileName);
}

export async function countEdgesConnectedTo(frame: Frame, nodePath: string): Promise<number> {
  return frame.locator('[aria-label^="Graph edge "]').evaluateAll((items, pathToFind) =>
    items.filter((item) => item.getAttribute('aria-label')?.includes(String(pathToFind))).length,
    nodePath,
  );
}

export async function readNodeVisualSize(context: GraphAcceptanceContext, nodePath: string): Promise<number> {
  const frame = requireGraphFrame(context);
  await findNodeProbe(context, nodePath);
  const box = await graphNode(frame, nodePath).boundingBox();
  if (!box) {
    throw new Error(`Expected ${nodePath} to expose a visual box`);
  }

  return Math.max(box.width, box.height);
}

export async function readScreenDistanceBetweenNodes(
  context: GraphAcceptanceContext,
  sourcePath: string,
  targetPath: string,
): Promise<number> {
  const frame = requireGraphFrame(context);
  const source = await readNodeProbe(frame, sourcePath);
  const target = await readNodeProbe(frame, targetPath);

  return distanceBetween(source.center, target.center);
}

export async function readGraphDebugZoom(frame: Frame): Promise<number | null> {
  return frame.evaluate(() => {
    const debug = window.__CODEGRAPHY_GRAPH_DEBUG__;
    const zoom = debug?.getSnapshot().zoom;
    return typeof zoom === 'number' && Number.isFinite(zoom) ? zoom : null;
  });
}

async function waitForNodeCenterToMove(
  frame: Frame,
  nodePath: string,
  before: Point,
  timeout = 5_000,
): Promise<Point> {
  await expect.poll(
    async () => distanceBetween(before, (await readNodeProbe(frame, nodePath)).center),
    { timeout },
  ).toBeGreaterThan(20);
  return (await readNodeProbe(frame, nodePath)).center;
}

async function analyzeNodePixels(frame: Frame, probe: NodeProbe): Promise<CanvasAnalysis> {
  return graphStage(frame).evaluate((stage, options) => {
    const canvases = stage.querySelectorAll('canvas');
    const canvas = canvases.item(canvases.length - 1);
    if (!(stage instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Expected Graph Stage to contain a canvas');
    }

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Expected Graph Stage canvas to expose a 2d context');
    }

    const stageRect = stage.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const toCanvasX = (x: number): number => Math.round(((x - (canvasRect.left - stageRect.left)) / canvasRect.width) * canvas.width);
    const toCanvasY = (y: number): number => Math.round(((y - (canvasRect.top - stageRect.top)) / canvasRect.height) * canvas.height);
    const center = {
      x: toCanvasX(options.probe.center.x),
      y: toCanvasY(options.probe.center.y),
    };
    const radius = Math.max(8, Math.round(options.probe.radius * (canvas.width / canvasRect.width)));
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    let bluePixelCount = 0;
    let whiteCenterPixelCount = 0;
    let labelPixelCount = 0;
    let outlinePixelCount = 0;

    for (let y = Math.max(0, center.y - radius - 24); y <= Math.min(canvas.height - 1, center.y + radius + 32); y += 1) {
      for (let x = Math.max(0, center.x - radius - 48); x <= Math.min(canvas.width - 1, center.x + radius + 48); x += 1) {
        const index = ((y * canvas.width) + x) * 4;
        const red = image.data[index];
        const green = image.data[index + 1];
        const blue = image.data[index + 2];
        const alpha = image.data[index + 3];
        const dx = x - center.x;
        const dy = y - center.y;
        const distance = Math.hypot(dx, dy);

        if (alpha < 80) {
          continue;
        }

        if (distance <= radius && Math.abs(red - options.blue.red) < 70 && Math.abs(green - options.blue.green) < 80 && Math.abs(blue - options.blue.blue) < 80) {
          bluePixelCount += 1;
        }

        if (distance <= radius * 0.65 && red > 210 && green > 210 && blue > 210) {
          whiteCenterPixelCount += 1;
        }

        if (dy > radius + 1 && dy < radius + 24 && red > 140 && green > 140 && blue > 140) {
          labelPixelCount += 1;
        }

        if (distance > radius * 0.6 && distance < radius + 20 && red > 170 && green > 170 && blue > 170) {
          outlinePixelCount += 1;
        }
      }
    }

    return {
      bluePixelCount,
      whiteCenterPixelCount,
      labelPixelCount,
      outlinePixelCount,
    };
  }, { probe, blue: BLUE_NODE_RGB });
}
