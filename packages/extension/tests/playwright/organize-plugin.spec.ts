import { expect, test, type Page } from '@playwright/test';

async function waitForGraphDebugBridge(page: Page): Promise<void> {
  await expect.poll(async () =>
    page.evaluate(() => Boolean(window.__CODEGRAPHY_GRAPH_DEBUG__)),
  ).toBe(true);
}

async function openCreateMenu(page: Page): Promise<void> {
  await page.getByTitle('New...').click();
  await expect(page.getByText('New File...')).toBeVisible();
}

async function closeFloatingMenus(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.mouse.click(8, 8);
}

async function rightClickNode(page: Page, nodeId: string): Promise<void> {
  await waitForGraphDebugBridge(page);
  await page.evaluate(async () => {
    window.__CODEGRAPHY_GRAPH_DEBUG__?.fitViewWithPadding(176);
    await new Promise(resolve => setTimeout(resolve, 500));
  });
  await page.evaluate((targetNodeId) => {
    window.__CODEGRAPHY_GRAPH_DEBUG__?.openNodeContextMenu(targetNodeId);
  }, nodeId);
}

async function toggleOrganizePlugin(page: Page): Promise<void> {
  await page.getByTitle('Plugins').click();
  await page.getByRole('switch').first().click();
  await page.getByTitle('Plugins').click();
}

test.describe('organize package plugin webview lifecycle', () => {
  test('adds and removes section and pin actions when the package plugin is toggled', async ({
    page,
  }) => {
    await page.goto('/organize-plugin');

    await expect(page.getByTestId('organize-harness-enabled')).toHaveText('on');
    await expect(page.getByTestId('organize-harness-messages')).toContainText('activated');

    await openCreateMenu(page);
    await expect(page.getByText('New Section...')).toBeVisible();
    await closeFloatingMenus(page);

    await rightClickNode(page, 'src/index.ts');
    await expect(page.getByText('Pin Node')).toBeVisible();
    await closeFloatingMenus(page);

    await toggleOrganizePlugin(page);

    await expect(page.getByTestId('organize-harness-enabled')).toHaveText('off');
    await openCreateMenu(page);
    await expect(page.getByText('New Section...')).toHaveCount(0);
    await closeFloatingMenus(page);

    await rightClickNode(page, 'src/index.ts');
    await expect(page.getByText('Pin Node')).toHaveCount(0);
    await closeFloatingMenus(page);

    await toggleOrganizePlugin(page);

    await expect(page.getByTestId('organize-harness-enabled')).toHaveText('on');
    await openCreateMenu(page);
    await expect(page.getByText('New Section...')).toBeVisible();
    await closeFloatingMenus(page);

    await rightClickNode(page, 'src/index.ts');
    await expect(page.getByText('Pin Node')).toBeVisible();
  });
});
