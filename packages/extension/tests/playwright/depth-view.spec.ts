import { expect, test, type Page } from '@playwright/test';

interface GraphDebugSnapshot {
  containerHeight: number;
  containerWidth: number;
  graphMode: '2d' | '3d';
  nodes: Array<{
    id: string;
    screenX: number;
    screenY: number;
    size: number;
  }>;
  zoom: number | null;
}

async function disableWebgl(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value(this: HTMLCanvasElement, contextId: string, options?: unknown) {
        if (
          contextId === 'webgl'
          || contextId === 'webgl2'
          || contextId === 'experimental-webgl'
        ) {
          return null;
        }

        return originalGetContext.call(this, contextId, options as never);
      },
    });
  });
}

async function waitForGraphDebugBridge(page: Page): Promise<void> {
  await expect.poll(async () =>
    page.evaluate(() => Boolean(window.__CODEGRAPHY_GRAPH_DEBUG__)),
  ).toBe(true);
}

async function getGraphDebugSnapshot(page: Page): Promise<GraphDebugSnapshot> {
  return page.evaluate(() => {
    const debugBridge = window.__CODEGRAPHY_GRAPH_DEBUG__;
    if (!debugBridge) {
      throw new Error('Expected graph debug bridge to be available');
    }

    return debugBridge.getSnapshot();
  });
}

async function refitGraphForVisualAssertion(page: Page, padding = 176): Promise<GraphDebugSnapshot> {
  await page.evaluate(async (requestedPadding) => {
    const debugBridge = window.__CODEGRAPHY_GRAPH_DEBUG__;
    if (!debugBridge) {
      throw new Error('Expected graph debug bridge to be available');
    }

    debugBridge.fitViewWithPadding(requestedPadding);
    await new Promise(resolve => setTimeout(resolve, 500));
  }, padding);

  return getGraphDebugSnapshot(page);
}

async function openDisplaySettings(page: Page): Promise<void> {
  await page.getByTitle('Settings').click();
  await page.getByRole('button', { name: 'Display' }).click();
  await expect(page.getByRole('button', { name: '2D' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Depth Mode' })).toBeVisible();
}

async function toggleDepthModeFromSettings(page: Page): Promise<void> {
  await openDisplaySettings(page);
  await page.getByRole('switch', { name: 'Depth Mode' }).click();
}

async function selectRendererFromSettings(page: Page, renderer: '2D' | '3D'): Promise<void> {
  await openDisplaySettings(page);
  await page.getByRole('button', { name: renderer }).click();
}

async function countVisibleWebglSamples(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const canvas = document.querySelector('.graph-container canvas');
    if (!(canvas instanceof HTMLCanvasElement)) {
      return 0;
    }

    return new Promise<number>((resolve) => {
      requestAnimationFrame(() => {
        const width = canvas.width;
        const height = canvas.height;
        if (width === 0 || height === 0) {
          resolve(0);
          return;
        }

        const snapshotCanvas = document.createElement('canvas');
        snapshotCanvas.width = width;
        snapshotCanvas.height = height;

        const context = snapshotCanvas.getContext('2d');
        if (!context) {
          resolve(0);
          return;
        }

        context.drawImage(canvas, 0, 0, width, height);

        const samplePoints = [
          [0.25, 0.25],
          [0.5, 0.25],
          [0.75, 0.25],
          [0.25, 0.5],
          [0.5, 0.5],
          [0.75, 0.5],
          [0.25, 0.75],
          [0.5, 0.75],
          [0.75, 0.75],
        ];

        let visibleSamples = 0;
        for (const [xRatio, yRatio] of samplePoints) {
          const x = Math.min(width - 1, Math.max(0, Math.floor(width * xRatio)));
          const y = Math.min(height - 1, Math.max(0, Math.floor(height * yRatio)));
          const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
          const isBackground = alpha === 255 && red === 24 && green === 24 && blue === 27;
          if (!isBackground) {
            visibleSamples += 1;
          }
        }

        resolve(visibleSamples);
      });
    });
  });
}

function expectNodesToFit(snapshot: GraphDebugSnapshot): void {
  expect(snapshot.zoom).not.toBeNull();
  const zoom = snapshot.zoom ?? 1;
  const horizontalInset = 16;
  const verticalInset = 16;

  for (const node of snapshot.nodes) {
    const radius = node.size * zoom;
    expect(node.screenX - radius).toBeGreaterThanOrEqual(horizontalInset);
    expect(node.screenX + radius).toBeLessThanOrEqual(snapshot.containerWidth - horizontalInset);
    expect(node.screenY - radius).toBeGreaterThanOrEqual(verticalInset);
    expect(node.screenY + radius).toBeLessThanOrEqual(snapshot.containerHeight - verticalInset);
  }
}

test.describe('webview depth view', () => {
  test('renders the local depth graph and updates rendered bounds as depth changes', async ({
    page,
  }) => {
    await page.goto('/depth-view');

    await expect(page.locator('.graph-container')).toBeVisible();
    await expect(page.locator('.graph-container canvas').first()).toBeVisible();
    await expect(page.getByTestId('depth-view-controls')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Open src\/index\.ts/ }),
    ).toBeVisible();

    await expect(page.getByTestId('depth-harness-view')).toHaveText('depth:on');
    await expect(page.getByTestId('depth-harness-depth')).toHaveText('1');
    await expect(page.getByTestId('depth-harness-node-count')).toHaveText('3');
    await expect(page.getByTestId('depth-harness-node-ids')).toContainText(
      'src/types.ts',
    );
    await expect(page.getByTestId('depth-harness-bounds-count')).toHaveText('3');
    await waitForGraphDebugBridge(page);
    expectNodesToFit(await refitGraphForVisualAssertion(page));

    const slider = page.getByTestId('depth-view-slider').getByRole('slider');
    await slider.focus();
    await slider.press('ArrowRight');

    await expect(page.getByTestId('depth-harness-depth')).toHaveText('2');
    await expect(page.getByTestId('depth-harness-node-count')).toHaveText('4');
    await expect(page.getByTestId('depth-harness-node-ids')).toContainText(
      'src/depth.ts',
    );
    await expect(page.getByTestId('depth-harness-bounds-count')).toHaveText('4');
    expectNodesToFit(await refitGraphForVisualAssertion(page));

    await toggleDepthModeFromSettings(page);

    await expect(page.getByTestId('depth-harness-view')).toHaveText('depth:off');
    await expect(page.getByTestId('depth-harness-node-count')).toHaveText('5');
    await expect(page.getByTestId('depth-harness-bounds-count')).toHaveText('5');
    await expect(page.getByTestId('depth-view-controls')).toHaveCount(0);
    expectNodesToFit(await refitGraphForVisualAssertion(page));
  });
});
