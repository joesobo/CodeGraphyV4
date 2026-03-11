import { expect, test } from '@playwright/test';

test.describe('webview smoke', () => {
  test('renders fallback shell outside VS Code host', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'CodeGraphy' })).toBeVisible();
    await expect(page.getByText(/No files found\./)).toBeVisible();
    await expect(page.getByText(/Open a folder to visualize its structure\./)).toBeVisible();
  });
});
