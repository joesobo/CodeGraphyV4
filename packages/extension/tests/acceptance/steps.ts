import { expect, type ElectronApplication, type Frame, type Page } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

interface VSCodeFixture {
  app: ElectronApplication;
  page: Page;
  tempRoot: string;
}

interface Point {
  x: number;
  y: number;
}

interface AcceptanceRuntimeStep {
  keyword: string;
  text: string;
  sourcePath: string;
  line: number;
}

interface GraphAcceptanceContext {
  cleanup: () => Promise<void>;
  workspaceTempRoot?: string;
  workspacePath?: string;
  vscode?: VSCodeFixture;
  graphFrame?: Frame;
  preIndexGraphImage?: Buffer;
  beforeDragCenter?: Point;
  afterDragCenter?: Point;
}

type AcceptanceStepImplementation = (
  context: GraphAcceptanceContext,
  step: AcceptanceRuntimeStep
) => Promise<void>;

const TARGET_FILE = 'src/index.ts';
const TARGET_LEGEND_COLOR = '#ff1744';

export async function createAcceptanceContext(_input: unknown): Promise<GraphAcceptanceContext> {
  const context: GraphAcceptanceContext = {
    cleanup: async () => {
      if (context.vscode) {
        await cleanupVSCode(context.vscode);
      }

      if (context.workspaceTempRoot) {
        fs.rmSync(context.workspaceTempRoot, { recursive: true, force: true });
      }
    }
  };

  return context;
}

export const acceptanceSteps: Record<string, AcceptanceStepImplementation> = {
  'I open the example TypeScript workspace': async (context) => {
    context.workspaceTempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-workspace-'));
    context.workspacePath = copyWorkspaceFixture(context.workspaceTempRoot);
  },

  'I open the CodeGraphy graph view': async (context) => {
    const workspacePath = requireValue(context.workspacePath, 'Expected example workspace to be open');
    context.vscode = await launchVSCodeWithWorkspace(workspacePath);
    await openGraphView(context.vscode.page);
    context.graphFrame = await waitForGraphFrame(context.vscode.page);
  },

  'I see file nodes before indexing': async (context) => {
    const graphFrame = requireGraphFrame(context);

    await expect(graphFrame.getByLabel('Graph Stage')).toBeVisible();
    await expect(graphFrame.getByText(/12 nodes • 0 edges/)).toBeVisible();
    await expect.poll(() => countGraphCanvasPixels(graphFrame)).toBeGreaterThan(0);
  },

  'I index the workspace': async (context) => {
    const graphFrame = requireGraphFrame(context);

    context.preIndexGraphImage = await graphFrame.getByLabel('Graph Stage').screenshot();
    await graphFrame.getByRole('button', { name: 'Index Workspace' }).click();
  },

  'I see indexing progress': async (context) => {
    await expect(requireGraphFrame(context).getByRole('progressbar', { name: 'Indexing progress' })).toBeVisible();
  },

  'I see indexing progress disappear': async (context) => {
    await expect(
      requireGraphFrame(context).getByRole('progressbar', { name: 'Indexing progress' })
    ).toBeHidden({ timeout: 30_000 });
  },

  'I see updated file nodes': async (context) => {
    await expect(requireGraphFrame(context).getByText(/12 nodes • 10 edges/)).toBeVisible();
  },

  'I see edges': async (context) => {
    const graphFrame = requireGraphFrame(context);
    const preIndexGraphImage = requireValue(
      context.preIndexGraphImage,
      'Expected pre-index Graph Stage screenshot to be captured'
    );

    await expect.poll(() => countGraphCanvasPixels(graphFrame)).toBeGreaterThan(0);
    const postIndexGraphImage = await graphFrame.getByLabel('Graph Stage').screenshot();
    expect(countChangedBytes(preIndexGraphImage, postIndexGraphImage)).toBeGreaterThan(500);
  },

  'I see the src/index.ts file node': async (context) => {
    const graphFrame = requireGraphFrame(context);

    await graphFrame.getByRole('button', { name: 'Fit to Screen' }).click();
    await expect.poll(() => getVisibleGraphPixelCenter(graphFrame)).toBeTruthy();
  },

  'I drag the src/index.ts file node': async (context) => {
    const graphFrame = requireGraphFrame(context);
    const graphStage = graphFrame.getByLabel('Graph Stage');
    const beforeDragCenter = await getVisibleGraphPixelCenter(graphFrame);

    await graphStage.dragTo(graphStage, {
      sourcePosition: beforeDragCenter,
      targetPosition: { x: beforeDragCenter.x + 64, y: beforeDragCenter.y + 32 },
    });

    context.beforeDragCenter = beforeDragCenter;
    context.afterDragCenter = await getVisibleGraphPixelCenter(graphFrame);
  },

  'the src/index.ts file node moves': async (context) => {
    const beforeDragCenter = requireValue(context.beforeDragCenter, 'Expected a node drag to start');
    const afterDragCenter = requireValue(context.afterDragCenter, 'Expected a node drag to finish');

    expect(distanceBetween(beforeDragCenter, afterDragCenter)).toBeGreaterThan(20);
  },

  'I activate the src/index.ts file node': async (context) => {
    const vscode = requireValue(context.vscode, 'Expected VS Code to be launched');
    await activateVisibleGraphNode(vscode.page, requireGraphFrame(context));
  },

  'src/index.ts opens in VS Code': async (context) => {
    const vscode = requireValue(context.vscode, 'Expected VS Code to be launched');
    await expect.poll(() => vscode.page.title(), { timeout: 10_000 }).toContain('index.ts');
  },
};

function repoRoot(): string {
  return path.resolve(__dirname, '../../../..');
}

function extensionRoot(): string {
  return path.resolve(repoRoot(), 'packages/extension');
}

function copyWorkspaceFixture(tempRoot: string): string {
  const sourcePath = path.join(repoRoot(), 'examples/example-typescript');
  const workspacePath = path.join(tempRoot, 'example-typescript');

  fs.cpSync(sourcePath, workspacePath, {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}.codegraphy${path.sep}`),
  });
  writeWorkspaceSettingsFixture(workspacePath);

  return workspacePath;
}

function writeWorkspaceSettingsFixture(workspacePath: string): void {
  const targetSettingsPath = path.join(workspacePath, '.codegraphy/settings.json');

  fs.mkdirSync(path.dirname(targetSettingsPath), { recursive: true });
  fs.writeFileSync(targetSettingsPath, `${JSON.stringify({
    version: 1,
    legend: [
      {
        id: 'e2e-target-index-file',
        displayLabel: 'E2E target file',
        pattern: TARGET_FILE,
        color: TARGET_LEGEND_COLOR,
        target: 'node',
        matchNodeType: 'file',
      },
    ],
  }, null, 2)}\n`);
}

function getLinuxSandboxArgs(): string[] {
  return process.platform === 'linux' ? ['--no-sandbox'] : [];
}

async function launchVSCodeWithWorkspace(workspacePath: string): Promise<VSCodeFixture> {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-vscode-playwright-'));
  const vscodeExecutablePath = await downloadAndUnzipVSCode({
    version: 'stable',
    cachePath: path.join(extensionRoot(), '.vscode-test'),
  });

  const { _electron } = await import('@playwright/test');
  const app = await _electron.launch({
    executablePath: vscodeExecutablePath,
    args: [
      workspacePath,
      `--extensionDevelopmentPath=${repoRoot()}`,
      '--user-data-dir',
      path.join(tempRoot, 'user-data'),
      '--extensions-dir',
      path.join(tempRoot, 'extensions'),
      '--use-inmemory-secretstorage',
      '--sync',
      'off',
      '--disable-telemetry',
      '--disable-updates',
      '--disable-workspace-trust',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-extensions',
      ...getLinuxSandboxArgs(),
    ],
    env: {
      ...process.env,
      HOME: path.join(tempRoot, 'home'),
    },
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded').catch(() => {});

  return { app, page, tempRoot };
}

async function openGraphView(page: Page): Promise<void> {
  const commandPaletteShortcut = process.platform === 'darwin' ? 'Meta+Shift+P' : 'Control+Shift+P';

  await page.bringToFront();
  await expect.poll(() => page.title(), { timeout: 15_000 }).toContain('[Extension Development Host]');
  await page.mouse.click(640, 450);
  await page.keyboard.press(commandPaletteShortcut);
  await page.keyboard.type('CodeGraphy: Open');
  await expect(page.getByText('CodeGraphy: Open', { exact: true }).first()).toBeVisible();
  await page.keyboard.press('Enter');
}

async function waitForGraphFrame(page: Page): Promise<Frame> {
  await expect.poll(async () => {
    for (const frame of page.frames().filter(candidate => candidate.url().includes('fake.html'))) {
      const graphStageCount = await frame.getByLabel('Graph Stage').count().catch(() => 0);
      if (graphStageCount > 0) {
        return true;
      }
    }

    return false;
  }, { timeout: 15_000 }).toBe(true);

  for (const frame of page.frames().filter(candidate => candidate.url().includes('fake.html'))) {
    const graphStageCount = await frame.getByLabel('Graph Stage').count().catch(() => 0);
    if (graphStageCount > 0) {
      return frame;
    }
  }

  throw new Error('Expected the Graph View webview frame to contain Graph Stage');
}

async function countGraphCanvasPixels(frame: Frame): Promise<number> {
  return frame.getByLabel('Graph Stage').locator('canvas').first().evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) {
      return 0;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return 0;
    }

    const { width, height } = canvas;
    if (width === 0 || height === 0) {
      return 0;
    }

    const image = context.getImageData(0, 0, width, height);
    let visiblePixels = 0;
    for (let index = 3; index < image.data.length; index += 4) {
      if (image.data[index] > 0) {
        visiblePixels += 1;
      }
    }

    return visiblePixels;
  });
}

function distanceBetween(previous: Point, next: Point): number {
  return Math.hypot(next.x - previous.x, next.y - previous.y);
}

function countChangedBytes(previous: Buffer, next: Buffer): number {
  const length = Math.min(previous.length, next.length);
  let changed = Math.abs(previous.length - next.length);

  for (let index = 0; index < length; index += 1) {
    if (previous[index] !== next[index]) {
      changed += 1;
    }
  }

  return changed;
}

async function getVisibleGraphPixelCenter(frame: Frame): Promise<Point> {
  const points = await getTargetNodeProbePoints(frame);
  return points[0];
}

async function getTargetNodeProbePoints(frame: Frame): Promise<Point[]> {
  return frame.getByLabel('Graph Stage').evaluate((stage) => {
    const canvas = stage.querySelector('canvas');
    if (!(stage instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Expected Graph Stage to contain a canvas');
    }

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Expected Graph Stage canvas to expose a 2d context');
    }

    const { width, height } = canvas;
    const image = context.getImageData(0, 0, width, height);
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = ((y * width) + x) * 4;
        const red = image.data[index];
        const green = image.data[index + 1];
        const blue = image.data[index + 2];
        const alpha = image.data[index + 3];
        if (alpha === 0 || red < 220 || green > 80 || blue > 120) {
          continue;
        }

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (minX > maxX || minY > maxY) {
      throw new Error('Expected Graph Stage canvas to contain the target node pixels');
    }

    const stageRect = stage.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const pixelPoints = [
      { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      { x: minX + ((maxX - minX) * 0.5), y: minY + ((maxY - minY) * 0.35) },
      { x: minX + ((maxX - minX) * 0.35), y: minY + ((maxY - minY) * 0.5) },
      { x: minX + ((maxX - minX) * 0.65), y: minY + ((maxY - minY) * 0.5) },
      { x: minX + ((maxX - minX) * 0.5), y: minY + ((maxY - minY) * 0.65) },
    ];

    return pixelPoints.map(point => ({
      x: Math.round((canvasRect.left - stageRect.left) + ((point.x / width) * canvasRect.width)),
      y: Math.round((canvasRect.top - stageRect.top) + ((point.y / height) * canvasRect.height)),
    }));
  });
}

async function activateVisibleGraphNode(page: Page, frame: Frame): Promise<void> {
  const graphStage = frame.getByLabel('Graph Stage');
  const probePoints = await getTargetNodeProbePoints(frame);

  for (const point of probePoints) {
    await graphStage.dblclick({ position: point });
    if ((await page.title()).includes('index.ts')) {
      return;
    }

    const opened = await page.waitForFunction(
      () => document.title.includes('index.ts'),
      undefined,
      { timeout: 1_000 }
    ).then(() => true, () => false);

    if (opened) {
      return;
    }
  }

  throw new Error('Expected one of the visible graph node activation points to open index.ts');
}

async function cleanupVSCode({ app, tempRoot }: VSCodeFixture): Promise<void> {
  await app.close().catch(() => {});
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function requireGraphFrame(context: GraphAcceptanceContext): Frame {
  return requireValue(context.graphFrame, 'Expected Graph View frame to be open');
}

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}
