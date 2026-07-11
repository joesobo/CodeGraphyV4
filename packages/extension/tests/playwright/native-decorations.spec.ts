import { expect, test } from '@playwright/test';

test.describe('native Git and problems decorations', () => {
  test('renders a Git ring and problem badge without rebuilding the graph', async ({ page }) => {
    await page.goto('/depth-view');
    await expect(page.locator('.graph-container canvas').first()).toBeVisible();
    await expect.poll(async () => page.evaluate(() => Boolean(window.__CODEGRAPHY_GRAPH_DEBUG__))).toBe(true);

    const nodeCountBefore = await page.evaluate(() =>
      window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().nodes.length ?? 0,
    );
    await page.evaluate(() => {
      window.postMessage({
        type: 'NATIVE_DECORATIONS_UPDATED',
        payload: {
          nodeDecorations: {
            'src/utils.ts': {
              border: { color: '#e2c08d', width: 4, style: 'solid' },
              badge: {
                text: '3',
                color: '#ffffff',
                bgColor: '#f14c4c',
                position: 'bottom-right',
              },
            },
          },
        },
      }, '*');
      window.__CODEGRAPHY_GRAPH_DEBUG__?.fitViewWithPadding(176);
    });

    await expect.poll(async () => page.evaluate(() => {
      const canvas = document.querySelector('.graph-container canvas');
      if (!(canvas instanceof HTMLCanvasElement)) return { badge: false, ring: false };
      const context = canvas.getContext('2d');
      if (!context) return { badge: false, ring: false };
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let badge = 0;
      let ring = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index] ?? 0;
        const green = pixels[index + 1] ?? 0;
        const blue = pixels[index + 2] ?? 0;
        if (Math.abs(red - 241) < 8 && Math.abs(green - 76) < 8 && Math.abs(blue - 76) < 8) badge += 1;
        if (Math.abs(red - 226) < 8 && Math.abs(green - 192) < 8 && Math.abs(blue - 141) < 8) ring += 1;
      }
      return { badge: badge > 5, ring: ring > 5 };
    })).toEqual({ badge: true, ring: true });
    expect(await page.evaluate(() =>
      window.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().nodes.length ?? 0,
    )).toBe(nodeCountBefore);
  });
});
