import { expect, test, type Frame } from '@playwright/test';
import fs from 'node:fs';
import {
  launchVSCodeWithWorkspace,
  openGraphView,
  waitForGraphFrame,
} from '../acceptance/graphView/vscode';
import {
  copyExampleTypescriptWorkspace,
  createWorkspaceTempRoot,
} from '../acceptance/graphView/workspace';

test('inline rename appears within 100ms and retains focus through a collision', async ({}, testInfo) => {
  const workspaceTempRoot = createWorkspaceTempRoot();
  const workspacePath = copyExampleTypescriptWorkspace(workspaceTempRoot);
  const vscode = await launchVSCodeWithWorkspace(workspacePath);

  try {
    await openGraphView(vscode.page);
    const frame = await waitForGraphFrame(vscode.page);
    await ensureIndexed(frame);
    const pair = await findSiblingFilePair(frame);
    const target = frame.getByRole('button', { name: `Graph node ${pair.target}` });
    await target.focus();
    await target.press('Enter');

    await frame.evaluate(() => {
      const runtime = window as typeof window & {
        __CODEGRAPHY_INLINE_GATE__?: { focusDepartures: number; latencyMs?: number; start: number };
      };
      runtime.__CODEGRAPHY_INLINE_GATE__ = { focusDepartures: 0, start: performance.now() };
      const observer = new MutationObserver(() => {
        const input = document.querySelector<HTMLInputElement>('[data-codegraphy-inline-edit] input');
        if (!input || runtime.__CODEGRAPHY_INLINE_GATE__?.latencyMs !== undefined) return;
        runtime.__CODEGRAPHY_INLINE_GATE__!.latencyMs = performance.now()
          - runtime.__CODEGRAPHY_INLINE_GATE__!.start;
        input.addEventListener('focusout', () => {
          runtime.__CODEGRAPHY_INLINE_GATE__!.focusDepartures += 1;
        });
        observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    await target.press('F2');
    const input = frame.getByRole('textbox', { name: 'Rename graph item' });
    await expect(input).toBeFocused();
    const latencyMs = await frame.evaluate(() => (
      window as typeof window & { __CODEGRAPHY_INLINE_GATE__?: { latencyMs?: number } }
    ).__CODEGRAPHY_INLINE_GATE__?.latencyMs);
    expect(latencyMs).toBeDefined();
    expect(latencyMs!).toBeLessThanOrEqual(100);

    await input.fill(pair.existingName);
    await input.press('Enter');
    await expect(frame.locator('[data-codegraphy-inline-edit] [role="alert"]')).toHaveText(
      `A file or folder **${pair.existingName}** already exists at this location. Please choose a different name.`,
    );
    await expect(input).toBeFocused();
    const focusDepartures = await frame.evaluate(() => (
      window as typeof window & { __CODEGRAPHY_INLINE_GATE__?: { focusDepartures: number } }
    ).__CODEGRAPHY_INLINE_GATE__?.focusDepartures);
    expect(focusDepartures).toBe(0);

    const screenshotPath = testInfo.outputPath('inline-rename-collision.png');
    await frame.getByLabel('Graph Stage').screenshot({ path: screenshotPath });
    await testInfo.attach('inline rename collision', { path: screenshotPath, contentType: 'image/png' });
    await input.press('Escape');
  } finally {
    await vscode.app.close().catch(() => {});
    fs.rmSync(vscode.tempRoot, { recursive: true, force: true });
    fs.rmSync(workspaceTempRoot, { recursive: true, force: true });
  }
});

async function ensureIndexed(frame: Frame): Promise<void> {
  const button = frame.getByRole('button', { name: 'Index Workspace' });
  if (await button.count() > 0 && await button.first().isVisible().catch(() => false)) {
    await button.click();
  }
  await expect.poll(async () => (
    frame.evaluate(() => window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().nodes.length ?? 0)
  ), { timeout: 30_000 }).toBeGreaterThan(1);
}

async function findSiblingFilePair(frame: Frame): Promise<{ target: string; existingName: string }> {
  return frame.evaluate(() => {
    const ids = (window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().nodes ?? [])
      .filter(node => node.id.endsWith('.ts'))
      .map(node => node.id);
    for (const target of ids) {
      const separator = target.lastIndexOf('/');
      const directory = separator < 0 ? '' : target.slice(0, separator + 1);
      const sibling = ids.find(id => id !== target && id.startsWith(directory) && !id.slice(directory.length).includes('/'));
      if (sibling) return { target, existingName: sibling.slice(directory.length) };
    }
    throw new Error('Expected two file nodes in one directory');
  });
}
