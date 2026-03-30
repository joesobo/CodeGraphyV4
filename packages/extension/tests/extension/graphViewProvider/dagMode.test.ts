import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphViewProviderTestHarness } from './testHarness';

describe('GraphViewProvider DAG mode', () => {
  let harness = createGraphViewProviderTestHarness();

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createGraphViewProviderTestHarness();
  });

  it('sends DAG_MODE_UPDATED on WEBVIEW_READY', async () => {
    const { mockWebview, getMessageHandler } = harness.createResolvedWebview();

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
    await new Promise(resolve => setTimeout(resolve, 20));

    const dagModeCall = mockWebview.postMessage.mock.calls.find(
      (call: unknown[]) => (call[0] as { type?: string }).type === 'DAG_MODE_UPDATED'
    );
    expect(dagModeCall).toBeDefined();
    const dagModeMessage = dagModeCall?.[0] as { payload: { dagMode: unknown } };
    expect(dagModeMessage.payload.dagMode).toBeNull();
  });

  it('handles UPDATE_DAG_MODE and echoes back DAG_MODE_UPDATED', async () => {
    const { mockWebview, getMessageHandler } = harness.createResolvedWebview();

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
    await new Promise(resolve => setTimeout(resolve, 20));

    mockWebview.postMessage.mockClear();
    await getMessageHandler()({ type: 'UPDATE_DAG_MODE', payload: { dagMode: 'td' } });

    const dagModeCall = mockWebview.postMessage.mock.calls.find(
      (call: unknown[]) => (call[0] as { type?: string }).type === 'DAG_MODE_UPDATED'
    );
    expect(dagModeCall).toBeDefined();
    const dagModeMessage = dagModeCall?.[0] as { payload: { dagMode: string } };
    expect(dagModeMessage.payload.dagMode).toBe('td');
  });

  it('persists dagMode to workspace state on UPDATE_DAG_MODE', async () => {
    const updateSpy = vi.fn().mockResolvedValue(undefined);
    harness.mockContext.workspaceState.update = updateSpy;
    harness.recreateProvider();

    const { getMessageHandler } = harness.createResolvedWebview();

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
    await new Promise(resolve => setTimeout(resolve, 20));

    await getMessageHandler()({ type: 'UPDATE_DAG_MODE', payload: { dagMode: 'lr' } });

    expect(updateSpy).toHaveBeenCalledWith('codegraphy.dagMode', 'lr');
  });
});
