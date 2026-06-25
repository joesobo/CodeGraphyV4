import { describe, expect, it, vi } from 'vitest';
import { createGraphViewPrimaryNodeFileHandlers } from '../../../../../src/extension/graphView/webview/dispatch/primaryState';
import { createPrimaryMessageContext } from './context';

describe('graph view primary message state adapters', () => {
  it('cancels queued plugin graph work before explicit graph refreshes', async () => {
    const cancelScheduledPluginGraphWork = vi.fn();
    const refreshIndex = vi.fn(() => Promise.resolve());
    const handlers = createGraphViewPrimaryNodeFileHandlers(createPrimaryMessageContext({
      cancelScheduledPluginGraphWork,
      refreshIndex,
    }));

    await handlers.refreshGraph();

    expect(cancelScheduledPluginGraphWork).toHaveBeenCalledOnce();
    expect(refreshIndex).toHaveBeenCalledOnce();
    expect(cancelScheduledPluginGraphWork.mock.invocationCallOrder[0])
      .toBeLessThan(refreshIndex.mock.invocationCallOrder[0]);
  });

  it('cancels queued plugin graph work before explicit graph indexing', async () => {
    const cancelScheduledPluginGraphWork = vi.fn();
    const indexAndSendData = vi.fn(() => Promise.resolve());
    const handlers = createGraphViewPrimaryNodeFileHandlers(createPrimaryMessageContext({
      cancelScheduledPluginGraphWork,
      indexAndSendData,
    }));

    await handlers.indexGraph();

    expect(cancelScheduledPluginGraphWork).toHaveBeenCalledOnce();
    expect(indexAndSendData).toHaveBeenCalledOnce();
    expect(cancelScheduledPluginGraphWork.mock.invocationCallOrder[0])
      .toBeLessThan(indexAndSendData.mock.invocationCallOrder[0]);
  });
});
