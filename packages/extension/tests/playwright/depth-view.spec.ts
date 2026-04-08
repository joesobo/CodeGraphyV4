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
      page.getByRole('button', { name: /Open packages\/app\/src\/index\.ts/ }),
    ).toBeVisible();

    await expect(page.getByTestId('depth-harness-view')).toHaveText('codegraphy.depth-graph');
    await expect(page.getByTestId('depth-harness-depth')).toHaveText('1');
    await expect(page.getByTestId('depth-harness-node-count')).toHaveText('3');
    await expect(page.getByTestId('depth-harness-node-ids')).toContainText(
      'packages/shared/src/types.ts',
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
      'packages/feature-depth/src/deep.ts',
    );
    await expect(page.getByTestId('depth-harness-bounds-count')).toHaveText('4');
    expectNodesToFit(await refitGraphForVisualAssertion(page));

    await page.getByTitle('Disable Depth Mode').click();

    await expect(page.getByTestId('depth-harness-view')).toHaveText('codegraphy.connections');
    await expect(page.getByTestId('depth-harness-node-count')).toHaveText('5');
    await expect(page.getByTestId('depth-harness-bounds-count')).toHaveText('5');
    await expect(page.getByTestId('depth-view-controls')).toHaveCount(0);
    expectNodesToFit(await refitGraphForVisualAssertion(page));
  });

  test('falls back to 2d when 3d mode cannot create a WebGL context', async ({ page }) => {
    await disableWebgl(page);
    await page.goto('/depth-view');

    await expect(page.locator('.graph-container canvas').first()).toBeVisible();

    await page.getByTitle('Toggle 2D/3D Mode').click();

    await expect.poll(async () => page.locator('.graph-container canvas').count()).toBeGreaterThan(0);
    await expect.poll(async () => {
      const snapshot = await getGraphDebugSnapshot(page);
      return snapshot.graphMode;
    }).toBe('2d');
  });

  test('keeps the app alive when 3d mode falls back to 2d', async ({ page }) => {
    await disableWebgl(page);
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto('/depth-view');
    await waitForGraphDebugBridge(page);

    await page.getByTitle('Toggle 2D/3D Mode').click();

    await expect.poll(async () => {
      const snapshot = await getGraphDebugSnapshot(page);
      return snapshot.graphMode;
    }).toBe('2d');

    await expect(page.locator('.graph-container canvas').first()).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).not.toContain(
      expect.stringContaining('Cannot read properties of undefined (reading \'tick\')'),
    );
  });
});
