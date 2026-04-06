import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphViewProviderTestHarness } from './testHarness';
import { createTypeScriptPlugin } from '../../../../plugin-typescript/src/plugin';

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

  it('includes the focused imports view after the TypeScript plugin registers', async () => {
    const { mockWebview, getMessageHandler } = harness.createResolvedWebview();

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
    await new Promise(resolve => setTimeout(resolve, 50));
    mockWebview.postMessage.mockClear();

    harness.provider.registerExternalPlugin(createTypeScriptPlugin(), {
      extensionUri: '/plugins/typescript',
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    const viewsUpdatedCalls = mockWebview.postMessage.mock.calls.filter(
      (call: unknown[]) => (call[0] as { type: string }).type === 'VIEWS_UPDATED'
    );
    expect(viewsUpdatedCalls.length).toBeGreaterThan(0);

    const latestViewsPayload = viewsUpdatedCalls.at(-1)?.[0] as {
      payload: { views: Array<{ id: string }> };
    };
    expect(latestViewsPayload.payload.views).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'codegraphy.typescript.focused-imports' }),
      ]),
    );
  });
});
