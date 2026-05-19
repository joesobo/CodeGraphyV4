import { expect, test, type Page, type TestInfo } from '@playwright/test';

interface GraphDebugNode {
  id: string;
  screenX: number;
  screenY: number;
  size: number;
}

interface GraphDebugSnapshot {
  containerHeight: number;
  containerWidth: number;
  graphMode: '2d' | '3d';
  nodes: GraphDebugNode[];
  zoom: number | null;
}

const SECTION_NODE_ID = 'section:frontend';
const CONTEXT_MENU_NODE_ID = 'src/theme.ts';

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

async function fitGraph(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const debugBridge = window.__CODEGRAPHY_GRAPH_DEBUG__;
    if (!debugBridge) {
      throw new Error('Expected graph debug bridge to be available');
    }

    debugBridge.fitViewWithPadding(176);
    await new Promise(resolve => setTimeout(resolve, 500));
  });
}

async function waitForNodePresence(
  page: Page,
  nodeId: string,
  expected: boolean,
): Promise<void> {
  await expect.poll(async () => {
    const snapshot = await getGraphDebugSnapshot(page);
    return snapshot.nodes.some(node => node.id === nodeId);
  }).toBe(expected);
}

async function getNode(page: Page, nodeId: string): Promise<GraphDebugNode> {
  const snapshot = await getGraphDebugSnapshot(page);
  const node = snapshot.nodes.find(candidate => candidate.id === nodeId);
  if (!node) {
    throw new Error(`Expected graph node '${nodeId}' to be present`);
  }

  return node;
}

async function expectNodePainted(page: Page, nodeId: string): Promise<void> {
  await expect.poll(async () => {
    const node = await getNode(page, nodeId);
    return page.evaluate(({ screenX, screenY }) => {
      const canvas = document.querySelector('.graph-container canvas');
      if (!(canvas instanceof HTMLCanvasElement)) {
        return 0;
      }

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return 0;
      }

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const centerX = Math.round(screenX * scaleX);
      const centerY = Math.round(screenY * scaleY);

      const snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = canvas.width;
      snapshotCanvas.height = canvas.height;
      const context = snapshotCanvas.getContext('2d');
      if (!context) {
        return 0;
      }
      context.drawImage(canvas, 0, 0, canvas.width, canvas.height);

      let paintedPixels = 0;
      for (let y = centerY - 14; y <= centerY + 14; y += 1) {
        for (let x = centerX - 14; x <= centerX + 14; x += 1) {
          if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
            continue;
          }

          const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
          const isGraphBackground = alpha === 255 && red === 24 && green === 24 && blue === 27;
          if (alpha > 0 && !isGraphBackground) {
            paintedPixels += 1;
          }
        }
      }

      return paintedPixels;
    }, { screenX: node.screenX, screenY: node.screenY });
  }).toBeGreaterThan(20);
}

async function expectPinContextMenuVisibility(
  page: Page,
  visible: boolean,
): Promise<void> {
  if (visible) {
    await expect(page.getByTestId('organize-harness-pin-state')).toHaveText('Pin Node');
    return;
  }

  await expect(page.getByTestId('organize-harness-pin-state')).toHaveText('pin:hidden');
}

async function captureStateScreenshot(
  page: Page,
  testInfo: TestInfo,
  fileName: string,
): Promise<void> {
  await page.screenshot({
    path: testInfo.outputPath(fileName),
    fullPage: true,
  });
}

async function setOrganizeEnabled(page: Page, enabled: boolean): Promise<void> {
  const expectedText = enabled ? 'organize:on' : 'organize:off';
  if (await page.getByTestId('organize-harness-view').textContent() === expectedText) {
    return;
  }

  await page.keyboard.press('Escape');
  await page.getByTestId('organize-harness-toggle').click();
  await expect(page.getByTestId('organize-harness-view')).toHaveText(expectedText);
  await fitGraph(page);
}

async function verifyOrganizeState({
  page,
  testInfo,
  enabled,
  screenshotName,
}: {
  page: Page;
  testInfo: TestInfo;
  enabled: boolean;
  screenshotName: string;
}): Promise<void> {
  await fitGraph(page);
  await waitForNodePresence(page, SECTION_NODE_ID, enabled);

  if (enabled) {
    await expectNodePainted(page, SECTION_NODE_ID);
  }

  await getNode(page, CONTEXT_MENU_NODE_ID);
  await expectPinContextMenuVisibility(page, enabled);
  await captureStateScreenshot(page, testInfo, screenshotName);
}

test.describe('webview organize plugin toggle', () => {
  test('visually adds and removes section nodes and pin actions with the Organize contribution state', async ({
    page,
  }, testInfo) => {
    await page.goto('/organize-toggle');
    await expect(page.locator('.graph-container')).toBeVisible();
    await waitForGraphDebugBridge(page);
    await expect(page.getByTestId('organize-harness-panel')).toHaveAttribute('data-ready', 'true');

    await verifyOrganizeState({
      page,
      testInfo,
      enabled: true,
      screenshotName: 'organize-toggle-01-on.png',
    });

    await setOrganizeEnabled(page, false);
    await verifyOrganizeState({
      page,
      testInfo,
      enabled: false,
      screenshotName: 'organize-toggle-02-off.png',
    });

    await setOrganizeEnabled(page, true);
    await verifyOrganizeState({
      page,
      testInfo,
      enabled: true,
      screenshotName: 'organize-toggle-03-on-again.png',
    });
  });
});
