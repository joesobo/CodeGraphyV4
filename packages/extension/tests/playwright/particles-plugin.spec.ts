import { expect, test } from '@playwright/test';

test.describe('particles plugin custom effects', () => {
  test('starts persisted built-in particles on launch', async ({ page }) => {
    await page.goto('/particles-plugin-embers-on-load');

    await page.getByTitle('Themes').click();
    await expect(page.getByRole('switch', { name: 'Toggle Embers background effect' }))
      .toHaveAttribute('data-state', 'checked');

    const canvas = page.locator('canvas.cg-bg-particles-canvas');
    await expect(canvas).toBeVisible();
    await expect.poll(async () => canvas.evaluate(readWarmPixelCount)).toBeGreaterThan(20);
  });

  test('renders a compiled custom particle effect in the graph background', async ({ page }) => {
    await page.goto('/particles-plugin');

    await page.getByTitle('Themes').click();
    await expect(page.getByText('Particles')).toBeVisible();
    await expect(page.getByText('Graph Background')).toHaveCount(0);
    await expect(page.getByRole('switch', { name: 'Toggle Fireflies custom background effect' }))
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

  test('renders warm embers and leaves across the graph background', async ({ page }) => {
    await page.goto('/particles-plugin');

    await page.getByTitle('Themes').click();
    const canvas = page.locator('canvas.cg-bg-particles-canvas');

    await page.getByRole('switch', { name: 'Toggle Embers background effect' }).click();
    await expect.poll(async () => canvas.evaluate(readWarmPixelCount)).toBeGreaterThan(20);

    await page.getByRole('switch', { name: 'Toggle Leaves background effect' }).click();
    await expect(page.getByRole('switch', { name: 'Toggle Leaves background effect' }))
      .toHaveAttribute('data-state', 'checked');
    await expect.poll(async () => canvas.evaluate(readLeafPixelCount)).toBeGreaterThan(10);
  });
});

function readWarmPixelCount(element: Element): number {
  const canvas = element as HTMLCanvasElement;
  const context = canvas.getContext('2d');
  if (!context) {
    return 0;
  }

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let count = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0;
    const green = pixels[index + 1] ?? 0;
    const blue = pixels[index + 2] ?? 0;
    const alpha = pixels[index + 3] ?? 0;
    if (alpha > 0 && red > green && green > blue) {
      count += 1;
    }
  }
  return count;
}

function readLeafPixelCount(element: Element): number {
  const canvas = element as HTMLCanvasElement;
  const context = canvas.getContext('2d');
  if (!context) {
    return 0;
  }

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let count = 0;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = ((y * canvas.width) + x) * 4;
      const red = pixels[index] ?? 0;
      const green = pixels[index + 1] ?? 0;
      const blue = pixels[index + 2] ?? 0;
      const alpha = pixels[index + 3] ?? 0;
      if (alpha > 0 && green > red && green > blue) {
        count += 1;
      }
    }
  }
  return count;
}
