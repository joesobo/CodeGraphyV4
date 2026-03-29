import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphViewProviderTestHarness } from './testHarness';

describe('GraphViewProvider focused file updates', () => {
  let harness = createGraphViewProviderTestHarness();

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createGraphViewProviderTestHarness();
  });

  it('sends VIEWS_UPDATED when focused file changes', async () => {
    const { mockWebview } = harness.createResolvedWebview();

    await new Promise(resolve => setTimeout(resolve, 50));
    mockWebview.postMessage.mockClear();

    harness.provider.setFocusedFile('src/app.ts');

    const viewsUpdatedCalls = mockWebview.postMessage.mock.calls.filter(
      (call: unknown[]) => (call[0] as { type: string }).type === 'VIEWS_UPDATED'
    );
    expect(viewsUpdatedCalls.length).toBe(1);
  });

  it('sends VIEWS_UPDATED when focused file is cleared', async () => {
    const { mockWebview } = harness.createResolvedWebview();

    await new Promise(resolve => setTimeout(resolve, 50));
    harness.provider.setFocusedFile('src/app.ts');

    mockWebview.postMessage.mockClear();
    harness.provider.setFocusedFile(undefined);

    const viewsUpdatedCalls = mockWebview.postMessage.mock.calls.filter(
      (call: unknown[]) => (call[0] as { type: string }).type === 'VIEWS_UPDATED'
    );
    expect(viewsUpdatedCalls.length).toBe(1);
  });

  it('does not send VIEWS_UPDATED when focused file does not change', async () => {
    const { mockWebview } = harness.createResolvedWebview();

    await new Promise(resolve => setTimeout(resolve, 50));
    harness.provider.setFocusedFile('src/app.ts');

    mockWebview.postMessage.mockClear();
    harness.provider.setFocusedFile('src/app.ts');

    const viewsUpdatedCalls = mockWebview.postMessage.mock.calls.filter(
      (call: unknown[]) => (call[0] as { type: string }).type === 'VIEWS_UPDATED'
    );
    expect(viewsUpdatedCalls.length).toBe(0);
  });
});
