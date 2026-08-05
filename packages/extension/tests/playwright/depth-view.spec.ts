import { expect, test, type Page } from '@playwright/test';

interface GraphDebugSnapshot {
  cameraCenterX: number | null;
  cameraCenterY: number | null;
  containerHeight: number;
  containerWidth: number;
  nodes: Array<{
    id: string;
    screenX: number;
    screenY: number;
    size: number;
  }>;
  zoom: number | null;
}

interface MinimapCameraState {
  boxCenterX: number;
  boxCenterY: number;
  boxHeight: number;
  boxWidth: number;
  snapshot: GraphDebugSnapshot;
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
  await expect(page.getByRole('switch', { name: 'Depth Mode' })).toBeVisible();
}

async function toggleDepthModeFromSettings(page: Page): Promise<void> {
  await openDisplaySettings(page);
  await page.getByRole('switch', { name: 'Depth Mode' }).click();
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

async function readMinimapCameraState(page: Page): Promise<MinimapCameraState> {
  const viewportBox = page.getByTestId('graph-minimap-viewport');
  await expect.poll(async () => viewportBox.evaluate(element => {
    const height = Number(element.getAttribute('height'));
    const width = Number(element.getAttribute('width'));
    return Number.isFinite(height) && height > 0 && Number.isFinite(width) && width > 0;
  })).toBe(true);
  const box = await viewportBox.evaluate(element => ({
    height: Number(element.getAttribute('height')),
    width: Number(element.getAttribute('width')),
    x: Number(element.getAttribute('x')),
    y: Number(element.getAttribute('y')),
  }));
  return {
    boxCenterX: box.x + box.width / 2,
    boxCenterY: box.y + box.height / 2,
    boxHeight: box.height,
    boxWidth: box.width,
    snapshot: await getGraphDebugSnapshot(page),
  };
}

function expectViewportBoxMatchesCamera(before: MinimapCameraState, after: MinimapCameraState): void {
  expect(before.snapshot.cameraCenterX).not.toBeNull();
  expect(before.snapshot.cameraCenterY).not.toBeNull();
  expect(after.snapshot.cameraCenterX).not.toBeNull();
  expect(after.snapshot.cameraCenterY).not.toBeNull();
  const cameraDeltaX = (after.snapshot.cameraCenterX ?? 0) - (before.snapshot.cameraCenterX ?? 0);
  const cameraDeltaY = (after.snapshot.cameraCenterY ?? 0) - (before.snapshot.cameraCenterY ?? 0);
  const boxDeltaX = after.boxCenterX - before.boxCenterX;
  const boxDeltaY = after.boxCenterY - before.boxCenterY;

  expect(cameraDeltaX * boxDeltaX).toBeGreaterThan(0);
  expect(cameraDeltaY * boxDeltaY).toBeGreaterThan(0);
}

function expectViewportBoxAspect(state: MinimapCameraState): void {
  expect(state.boxWidth / state.boxHeight).toBeCloseTo(
    state.snapshot.containerWidth / state.snapshot.containerHeight,
    3,
  );
}

async function centerAndZoomGraph(page: Page): Promise<void> {
  await page.evaluate(() => {
    const debugBridge = window.__CODEGRAPHY_GRAPH_DEBUG__;
    if (!debugBridge?.centerNode('src/index.ts', 50)) {
      throw new Error('Expected debug bridge to center the graph');
    }
  });
  await expect.poll(async () => (await getGraphDebugSnapshot(page)).zoom).toBe(50);
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await expect.poll(async () => Number(
    await page.getByTestId('graph-minimap-viewport').getAttribute('width'),
  )).toBeLessThan(100);
}

async function dragMinimapCamera(page: Page, deltaX: number, deltaY: number): Promise<void> {
  const minimap = page.getByTestId('graph-minimap');
  const bounds = await minimap.boundingBox();
  if (!bounds) throw new Error('Expected visible minimap bounds');
  const startX = bounds.x + bounds.width / 2;
  const startY = bounds.y + bounds.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 4 });
  await page.mouse.up();
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

test.describe('webview depth view', () => {
  test('keeps the minimap viewport aligned with camera pan, resize, and graph changes', async ({
    page,
  }) => {
    await page.goto('/depth-view');
    await waitForGraphDebugBridge(page);
    await expect(page.getByTestId('graph-minimap')).toBeVisible();
    await centerAndZoomGraph(page);

    const initial = await readMinimapCameraState(page);
    expectViewportBoxAspect(initial);
    await dragMinimapCamera(page, 20, 24);
    const panned = await readMinimapCameraState(page);
    expectViewportBoxMatchesCamera(initial, panned);

    await page.setViewportSize({ width: 900, height: 650 });
    await centerAndZoomGraph(page);
    const resized = await readMinimapCameraState(page);
    expectViewportBoxAspect(resized);

    const slider = page.getByTestId('depth-view-slider').getByRole('slider');
    await slider.focus();
    await slider.press('ArrowRight');
    await expect(page.getByTestId('depth-harness-node-count')).toHaveText('4');
    await centerAndZoomGraph(page);
    const changed = await readMinimapCameraState(page);
    await dragMinimapCamera(page, -18, 22);
    const changedAndPanned = await readMinimapCameraState(page);
    expectViewportBoxAspect(changed);
    expectViewportBoxMatchesCamera(changed, changedAndPanned);

    const minimap = page.getByTestId('graph-minimap');
    await minimap.focus();
    await minimap.press('ArrowDown');
    await page.evaluate(() => new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    const keyboardPanned = await readMinimapCameraState(page);
    expect(keyboardPanned.snapshot.cameraCenterY)
      .toBeGreaterThan(changedAndPanned.snapshot.cameraCenterY ?? Number.NEGATIVE_INFINITY);
    expect(keyboardPanned.boxCenterY).toBeGreaterThan(changedAndPanned.boxCenterY);
  });

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
