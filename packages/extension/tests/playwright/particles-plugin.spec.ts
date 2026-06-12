import { expect, test } from '@playwright/test';

test.describe('particles plugin custom effects', () => {
  test('renders a compiled custom particle effect in the graph background', async ({ page }) => {
    await page.goto('/particles-plugin');

    await page.getByTitle('Themes').click();
    await expect(page.getByText('Graph Background')).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Toggle Repo Fireflies custom background effect' }))
      .toHaveAttribute('data-state', 'checked');

    const canvas = page.locator('canvas.cg-bg-particles-canvas');
    await expect(canvas).toBeVisible();
    await expect.poll(async () =>
      canvas.evaluate((element) => {
        const particleCanvas = element as HTMLCanvasElement;
        const context = particleCanvas.getContext('2d');
        if (!context) {
          return 0;
        }
        const { width, height } = particleCanvas;
        const pixels = context.getImageData(0, 0, width, height).data;
        let nonTransparentPixels = 0;
        for (let index = 3; index < pixels.length; index += 4) {
          if (pixels[index] > 0) {
            nonTransparentPixels += 1;
          }
        }
        return nonTransparentPixels;
      }),
    ).toBeGreaterThan(0);
  });
});
