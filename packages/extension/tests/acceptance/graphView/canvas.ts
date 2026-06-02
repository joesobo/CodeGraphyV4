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
  return graphStage(frame).locator('canvas').first().evaluate((canvas) => {
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
  const match = text.match(/(\d+)\s+nodes\s+•\s+(\d+)\s+(?:edges|connections)/);
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
  await frame.getByRole('button', { name: 'Fit to Screen' }).click();
  const probe = await waitForStableNodeProbe(frame, nodePath);
  context.nodeProbes.set(nodePath, probe);
  return probe;
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

async function readNodeProbe(frame: Frame, nodePath: string): Promise<NodeProbe> {
  const nodeLocator = frame.getByLabel(`Graph node ${nodePath}`, { exact: true });
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

async function moveMouseToStagePoint(frame: Frame, point: Point): Promise<void> {
  const stageBox = await graphStage(frame).boundingBox();
  if (!stageBox) {
    throw new Error('Expected Graph Stage to have a bounding box');
  }

  await frame.page().mouse.move(stageBox.x + point.x, stageBox.y + point.y);
}

async function dispatchCanvasMouseMoveToStagePoint(frame: Frame, point: Point): Promise<void> {
  await graphStage(frame).evaluate((stage, stagePoint) => {
    const canvas = stage.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Expected Graph Stage to contain a canvas');
    }

    const rect = stage.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + stagePoint.x,
      clientY: rect.top + stagePoint.y,
      view: window,
    }));
  }, point);
}

async function dragMouseBetweenStagePoints(frame: Frame, source: Point, target: Point): Promise<void> {
  const stageBox = await graphStage(frame).boundingBox();
  if (!stageBox) {
    throw new Error('Expected Graph Stage to have a bounding box');
  }

  const page = frame.page();
  await page.mouse.move(stageBox.x + source.x, stageBox.y + source.y);
  await page.mouse.down();
  await page.mouse.move(stageBox.x + target.x, stageBox.y + target.y, { steps: 12 });
  await page.mouse.up();
}

export async function hoverNode(context: GraphAcceptanceContext, nodePath: string): Promise<NodeProbe> {
  const frame = requireGraphFrame(context);
  const probe = await findNodeProbe(context, nodePath);
  const tooltipPath = frame.getByText(nodePath, { exact: true }).first();
  const hoverPoints = getNodeHoverProbePoints(probe);

  for (const point of hoverPoints) {
    await graphStage(frame).hover({ position: point, force: true });
    await moveMouseToStagePoint(frame, point);
    await dispatchCanvasMouseMoveToStagePoint(frame, point);
    await frame.waitForTimeout(650);

    if (await tooltipPath.isVisible()) {
      return probe;
    }
  }

  await expect(tooltipPath).toBeVisible({ timeout: 10_000 });
  return probe;
}

function getNodeHoverProbePoints(probe: NodeProbe): Point[] {
  const step = Math.max(4, Math.min(12, Math.round(probe.radius / 2)));
  const outerStep = Math.max(step + 4, Math.round(probe.radius));
  return [
    probe.center,
    { x: probe.center.x - step, y: probe.center.y },
    { x: probe.center.x + step, y: probe.center.y },
    { x: probe.center.x, y: probe.center.y - step },
    { x: probe.center.x, y: probe.center.y + step },
    { x: probe.center.x - step, y: probe.center.y - step },
    { x: probe.center.x + step, y: probe.center.y - step },
    { x: probe.center.x - step, y: probe.center.y + step },
    { x: probe.center.x + step, y: probe.center.y + step },
    { x: probe.center.x - outerStep, y: probe.center.y },
    { x: probe.center.x + outerStep, y: probe.center.y },
    { x: probe.center.x, y: probe.center.y - outerStep },
    { x: probe.center.x, y: probe.center.y + outerStep },
    { x: probe.center.x - outerStep, y: probe.center.y - outerStep },
    { x: probe.center.x + outerStep, y: probe.center.y - outerStep },
    { x: probe.center.x - outerStep, y: probe.center.y + outerStep },
    { x: probe.center.x + outerStep, y: probe.center.y + outerStep },
  ];
}

export async function clickNode(context: GraphAcceptanceContext, nodePath: string): Promise<void> {
  const frame = requireGraphFrame(context);
  const probe = await findNodeProbe(context, nodePath);
  await graphStage(frame).click({ position: probe.center, force: true });
}

export async function dragNode(context: GraphAcceptanceContext, nodePath: string): Promise<void> {
  const frame = requireGraphFrame(context);
  const probe = await findNodeProbe(context, nodePath);
  const target = { x: probe.center.x + 96, y: probe.center.y - 72 };

  await dragMouseBetweenStagePoints(frame, probe.center, target);

  context.beforeDragCenter = probe.center;
  context.nodeProbes.delete(nodePath);
  context.afterDragCenter = (await readNodeProbe(frame, nodePath)).center;
  context.nodeProbes.set(nodePath, {
    path: nodePath,
    center: context.afterDragCenter,
    radius: probe.radius,
  });
}

export async function recordDroppedNodeCenter(context: GraphAcceptanceContext): Promise<void> {
  await requireGraphFrame(context).waitForTimeout(300);
  context.dropCenter = (await readNodeProbe(requireGraphFrame(context), TARGET_NODE)).center;
}

export async function expectNodeStaysDropped(context: GraphAcceptanceContext): Promise<void> {
  const dropCenter = requireValue(context.dropCenter, 'Expected a dropped node position');
  await requireGraphFrame(context).waitForTimeout(500);
  const nextCenter = await readNodeProbe(requireGraphFrame(context), TARGET_NODE);

  expect(distanceBetween(dropCenter, nextCenter.center)).toBeLessThan(8);
}

export async function expectNodeLooksBlue(frame: Frame, probe: NodeProbe): Promise<void> {
  const analysis = await analyzeNodePixels(frame, probe);
  expect(analysis.bluePixelCount).toBeGreaterThan(40);
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
  const analysis = await analyzeNodePixels(frame, probe);
  expect(analysis.outlinePixelCount).toBeGreaterThan(10);
}

export async function expectVisibleEdgeBetween(
  context: GraphAcceptanceContext,
  sourcePath: string,
  targetPath: string,
): Promise<void> {
  const frame = requireGraphFrame(context);
  const source = await findNodeProbe(context, sourcePath);
  const target = await findNodeProbe(context, targetPath);

  await expect(frame.getByLabel(`Graph edge ${sourcePath} to ${targetPath}`, { exact: true })).toBeAttached();
  await expect.poll(() => countImportColoredPixelsOnLine(frame, source.center, target.center)).toBeGreaterThan(3);
}

export async function waitForFileOpened(page: Page, fileName: string): Promise<void> {
  await expect.poll(() => page.title(), { timeout: 10_000 }).toContain(fileName);
}

async function analyzeNodePixels(frame: Frame, probe: NodeProbe): Promise<CanvasAnalysis> {
  return graphStage(frame).evaluate((stage, options) => {
    const canvas = stage.querySelector('canvas');
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

async function countImportColoredPixelsOnLine(frame: Frame, source: Point, target: Point): Promise<number> {
  return graphStage(frame).evaluate((stage, options) => {
    const canvas = stage.querySelector('canvas');
    if (!(stage instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Expected Graph Stage to contain a canvas');
    }

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Expected Graph Stage canvas to expose a 2d context');
    }

    const stageRect = stage.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const toCanvas = (point: Point): Point => ({
      x: Math.round(((point.x - (canvasRect.left - stageRect.left)) / canvasRect.width) * canvas.width),
      y: Math.round(((point.y - (canvasRect.top - stageRect.top)) / canvasRect.height) * canvas.height),
    });

    const sourcePoint = toCanvas(options.source);
    const targetPoint = toCanvas(options.target);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    let matchingPixels = 0;

    for (let step = 8; step <= 92; step += 2) {
      const ratio = step / 100;
      const x = Math.round(sourcePoint.x + ((targetPoint.x - sourcePoint.x) * ratio));
      const y = Math.round(sourcePoint.y + ((targetPoint.y - sourcePoint.y) * ratio));

      for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
        for (let offsetY = -2; offsetY <= 2; offsetY += 1) {
          const sampleX = x + offsetX;
          const sampleY = y + offsetY;
          if (sampleX < 0 || sampleY < 0 || sampleX >= canvas.width || sampleY >= canvas.height) {
            continue;
          }

          const index = ((sampleY * canvas.width) + sampleX) * 4;
          const red = image.data[index];
          const green = image.data[index + 1];
          const blue = image.data[index + 2];
          const alpha = image.data[index + 3];
          if (alpha > 80 && blue > red + 25 && green > red + 10) {
            matchingPixels += 1;
          }
        }
      }
    }

    return matchingPixels;
  }, { source, target });
}
