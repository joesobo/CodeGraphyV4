import { expect } from '@playwright/test';
import { clickToolbarButton, requireGraphFrame } from '../graphView/canvas';
import type { AcceptanceStepImplementation } from '../graphView/types';

async function setShowFps(
  context: Parameters<AcceptanceStepImplementation>[0],
  enabled: boolean,
): Promise<void> {
  const toggle = requireGraphFrame(context).getByRole('switch', { name: 'Show FPS' });
  const checked = await toggle.getAttribute('aria-checked') === 'true';
  if (checked !== enabled) await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', String(enabled));
}

export const settingsAcceptanceSteps: Record<string, AcceptanceStepImplementation> = {
  'I open Performance settings': async (context) => {
    const frame = requireGraphFrame(context);
    await clickToolbarButton(frame, 'Settings');
    await frame.getByRole('button', { name: 'Performance', exact: true }).click();
  },
  'I turn Show FPS on': context => setShowFps(context, true),
  'I see a finite positive graph FPS': async (context) => {
    const frame = requireGraphFrame(context);
    await expect(frame.getByTestId('graph-fps')).toBeVisible();
    await expect.poll(() => frame.evaluate(() => {
      const fps = window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().fps;
      const potentialFps = Number(
        document.querySelector('[data-codegraphy-overlay="fps"]')
          ?.getAttribute('data-potential-fps'),
      );
      return typeof fps === 'number'
        && Number.isFinite(fps)
        && fps > 0
        && Number.isFinite(potentialFps)
        && potentialFps > 0;
    })).toBe(true);
  },
  'I turn Show FPS off': context => setShowFps(context, false),
  'I do not see the graph FPS counter': async (context) => {
    const frame = requireGraphFrame(context);
    await expect(frame.getByTestId('graph-fps')).toHaveCount(0);
    await expect.poll(() => frame.evaluate(() =>
      window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().fps ?? null
    )).toBeNull();
  },
};

export const settingsAcceptanceStepExpressions = Object.keys(settingsAcceptanceSteps);
