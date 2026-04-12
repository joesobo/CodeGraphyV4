import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphViewProviderTestHarness } from './testHarness';
import { createTypeScriptPlugin } from '../../../../plugin-typescript/src/plugin';

describe('GraphViewProvider focused file updates', () => {
  let harness = createGraphViewProviderTestHarness();

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createGraphViewProviderTestHarness();
  });

  it('sends ACTIVE_FILE_UPDATED when focused file changes', async () => {
    const { mockWebview } = harness.createResolvedWebview();

    await new Promise(resolve => setTimeout(resolve, 50));
    mockWebview.postMessage.mockClear();

    harness.provider.setFocusedFile('src/app.ts');

    const activeFileCalls = mockWebview.postMessage.mock.calls.filter(
      (call: unknown[]) => (call[0] as { type: string }).type === 'ACTIVE_FILE_UPDATED'
    );
    expect(activeFileCalls).toEqual([
      [{ type: 'ACTIVE_FILE_UPDATED', payload: { filePath: 'src/app.ts' } }],
    ]);
  });

  it('sends ACTIVE_FILE_UPDATED when focused file is cleared', async () => {
    const { mockWebview } = harness.createResolvedWebview();

    await new Promise(resolve => setTimeout(resolve, 50));
    harness.provider.setFocusedFile('src/app.ts');

    mockWebview.postMessage.mockClear();
    harness.provider.setFocusedFile(undefined);

    const activeFileCalls = mockWebview.postMessage.mock.calls.filter(
      (call: unknown[]) => (call[0] as { type: string }).type === 'ACTIVE_FILE_UPDATED'
    );
    expect(activeFileCalls).toEqual([
      [{ type: 'ACTIVE_FILE_UPDATED', payload: { filePath: undefined } }],
    ]);
  });

  it('does not send ACTIVE_FILE_UPDATED when focused file does not change', async () => {
    const { mockWebview } = harness.createResolvedWebview();

    await new Promise(resolve => setTimeout(resolve, 50));
    harness.provider.setFocusedFile('src/app.ts');

    mockWebview.postMessage.mockClear();
    harness.provider.setFocusedFile('src/app.ts');

    const activeFileCalls = mockWebview.postMessage.mock.calls.filter(
      (call: unknown[]) => (call[0] as { type: string }).type === 'ACTIVE_FILE_UPDATED'
    );
    expect(activeFileCalls.length).toBe(0);
  });

  it('does not emit the deprecated views-updated message after plugin registration', async () => {
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
    expect(viewsUpdatedCalls).toEqual([]);
  });
});
