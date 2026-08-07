import { expect, test, type Frame } from '@playwright/test';
import fs from 'node:fs';
import {
  clickFitToScreenIfAvailable,
  graphNode,
} from '../acceptance/graphView/canvas';
import {
  launchVSCodeWithWorkspace,
  openGraphView,
  waitForGraphFrame,
} from '../acceptance/graphView/vscode';
import {
  copyExampleTypescriptWorkspace,
  createWorkspaceTempRoot,
} from '../acceptance/graphView/workspace';

const captureProof = process.env.CODEGRAPHY_CAPTURE_TOOLTIP_PROOF === '1';
const explorerShortcut = process.platform === 'darwin' ? 'Meta+Shift+E' : 'Control+Shift+E';

test.use({ video: captureProof ? 'on' : 'retain-on-failure' });

test('Hover performance: stationary and hidden Node tooltips stop graph frame work in an Extension Development Host', async ({}, testInfo) => {
  const workspaceTempRoot = createWorkspaceTempRoot();
  const workspacePath = copyExampleTypescriptWorkspace(workspaceTempRoot);
  const vscode = await launchVSCodeWithWorkspace(workspacePath);

  try {
    await openGraphView(vscode.page);
    const frame = await waitForGraphFrame(vscode.page);
    await indexWorkspace(frame);
    await clickFitToScreenIfAvailable(frame);
    await expect.poll(() => hasPositionedNode(frame, 'src/index.ts'), {
      timeout: 10_000,
    }).toBe(true);
    await expect.poll(() => readGraphFps(frame)).toBeNull();
    await installFrameProbe(frame);

    await graphNode(frame, 'src/index.ts').dispatchEvent('mouseover', { bubbles: true });
    await expect(frame.getByText('src/index.ts', { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });
		await waitForFrameProbeIdle(frame);
    await resetFrameProbe(frame);
		const stationaryFrameRequests = await observeFrameRequests(frame, 1_500);
    expect(stationaryFrameRequests).toBe(0);
    expect(await readGraphFps(frame)).toBeNull();
    await showFrameEvidence(frame, {
      stationaryFrameRequests,
    });

		const screenshotPath = testInfo.outputPath('stationary-tooltip-zero-frames.png');
		await frame.locator('body').screenshot({ path: screenshotPath });
		await testInfo.attach('stationary tooltip zero frames', {
			contentType: 'image/png',
			path: screenshotPath,
		});

    await vscode.page.keyboard.press(explorerShortcut);
		await expect(frameProbe(frame)).toHaveAttribute('data-graph-view-visible', 'false', {
			timeout: 10_000,
		});
		expect(await readDocumentVisibility(frame)).toBe('visible');
		await expect(frame.getByText('src/index.ts', { exact: true })).toHaveCount(0);
		await waitForFrameProbeIdle(frame);
		await resetFrameProbe(frame);
		const hiddenFrameRequests = await observeFrameRequests(frame, 1_500);
    expect(hiddenFrameRequests).toBe(0);
    expect(await readGraphFps(frame)).toBeNull();

		await openGraphView(vscode.page);
		await expect(frameProbe(frame)).toHaveAttribute('data-graph-view-visible', 'true', {
			timeout: 10_000,
		});
		await graphNode(frame, 'src/index.ts').dispatchEvent('mouseover', { bubbles: true });
		await expect(frame.getByText('src/index.ts', { exact: true }).first()).toBeVisible();
		await showFrameEvidence(frame, { hiddenFrameRequests, stationaryFrameRequests });
		const lifecycleScreenshotPath = testInfo.outputPath('tooltip-frame-lifecycle.png');
		await frame.locator('body').screenshot({ path: lifecycleScreenshotPath });
		await testInfo.attach('tooltip frame lifecycle', {
			contentType: 'image/png',
			path: lifecycleScreenshotPath,
		});
  } finally {
    await vscode.app.close().catch(() => {});
    fs.rmSync(vscode.tempRoot, { recursive: true, force: true });
    fs.rmSync(workspaceTempRoot, { recursive: true, force: true });
  }
});

async function indexWorkspace(frame: Frame): Promise<void> {
  const indexButton = frame.getByRole('button', { name: 'Index Workspace' });
  if (await indexButton.count() === 0 || !(await indexButton.first().isVisible().catch(() => false))) {
    return;
  }
  await indexButton.click();
  await expect(frame.getByRole('progressbar', { name: 'Indexing progress' }))
    .toBeHidden({ timeout: 30_000 });
}

async function hasPositionedNode(frame: Frame, nodeId: string): Promise<boolean> {
  return frame.evaluate((targetNodeId) => {
    return window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().nodes.some(
      node => node.id === targetNodeId && node.positionFinite,
    ) ?? false;
  }, nodeId);
}

async function installFrameProbe(frame: Frame): Promise<void> {
  await frame.evaluate(() => {
    const output = document.createElement('output');
    output.dataset.codegraphyTooltipFrameProbe = 'true';
    output.dataset.frameRequests = '0';
		output.dataset.graphViewVisible = 'true';
    output.hidden = true;
    document.body.append(output);
		window.addEventListener('message', (event: MessageEvent<unknown>) => {
			const message = event.data;
			if (!message || typeof message !== 'object') return;
			if (!('type' in message) || message.type !== 'GRAPH_VIEW_VISIBILITY_UPDATED') return;
			if (!('payload' in message) || !message.payload || typeof message.payload !== 'object') return;
			if (!('visible' in message.payload) || typeof message.payload.visible !== 'boolean') return;
			output.dataset.graphViewVisible = String(message.payload.visible);
		});
    const requestFrame = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
      output.dataset.frameRequests = String(
        Number(output.dataset.frameRequests ?? '0') + 1,
      );
      return requestFrame(callback);
    };
  });
}

function frameProbe(frame: Frame) {
  return frame.locator('[data-codegraphy-tooltip-frame-probe="true"]');
}

async function resetFrameProbe(frame: Frame): Promise<void> {
  await frameProbe(frame).evaluate((element) => {
    element.dataset.frameRequests = '0';
  });
}

async function readFrameProbe(frame: Frame): Promise<number> {
	return frameProbe(frame).evaluate(element => Number(element.dataset.frameRequests));
}

async function waitForFrameProbeIdle(frame: Frame): Promise<void> {
	let previousFrameRequests = await readFrameProbe(frame);
	let lastChangeAt = Date.now();
	await expect.poll(async () => {
		const currentFrameRequests = await readFrameProbe(frame);
		if (currentFrameRequests !== previousFrameRequests) {
			previousFrameRequests = currentFrameRequests;
			lastChangeAt = Date.now();
		}
		return Date.now() - lastChangeAt;
	}, { intervals: [100], timeout: 5_000 }).toBeGreaterThanOrEqual(500);
}

async function observeFrameRequests(frame: Frame, durationMs: number): Promise<number> {
	const startedAt = Date.now();
	let maximumFrameRequests = 0;
	await expect.poll(async () => {
		maximumFrameRequests = Math.max(maximumFrameRequests, await readFrameProbe(frame));
		return {
			complete: Date.now() - startedAt >= durationMs,
			maximumFrameRequests,
		};
	}, {
		intervals: [100],
		timeout: durationMs + 3_000,
	}).toEqual({ complete: true, maximumFrameRequests: 0 });
	return maximumFrameRequests;
}

async function readGraphFps(frame: Frame): Promise<number | null> {
  return frame.evaluate(() => window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().fps ?? null);
}

async function readDocumentVisibility(frame: Frame): Promise<DocumentVisibilityState> {
  return frame.evaluate(() => document.visibilityState);
}

async function showFrameEvidence(frame: Frame, evidence: {
  hiddenFrameRequests?: number;
  stationaryFrameRequests: number;
}): Promise<void> {
  await frame.evaluate((currentEvidence) => {
    const output = document.querySelector('[data-codegraphy-tooltip-frame-probe="true"]');
    if (!(output instanceof HTMLOutputElement)) return;
    output.hidden = false;
    output.style.cssText = [
      'position: fixed',
      'right: 16px',
      'bottom: 16px',
      'z-index: 9999',
      'padding: 10px 12px',
      'border: 1px solid #22c55e',
      'border-radius: 8px',
      'background: #052e16',
      'color: #dcfce7',
      'font: 12px/1.5 ui-monospace, monospace',
      'white-space: pre-line',
      'box-shadow: 0 8px 24px rgba(0,0,0,.35)',
    ].join(';');
    output.textContent = [
      'Stationary Node tooltip',
      `1.5 s webview RAF requests: ${currentEvidence.stationaryFrameRequests}`,
      'Physics/render FPS: idle',
			...(currentEvidence.hiddenFrameRequests === undefined
				? []
				: [`Hidden Graph View webview RAF requests: ${currentEvidence.hiddenFrameRequests}`]),
    ].join('\n');
  }, evidence);
}
