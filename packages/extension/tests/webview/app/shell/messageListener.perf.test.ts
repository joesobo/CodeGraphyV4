import { describe, expect, it, vi } from 'vitest';

import type { PerfControlMessage } from '../../../../src/shared/perf/protocol';
import { createMessageHandler, type InjectAssetsParams } from '../../../../src/webview/app/shell/messageListener';
import type { WebviewPluginHost } from '../../../../src/webview/pluginHost/manager';
import { graphStore } from '../../../../src/webview/store/state';

describe('app message listener performance controls', () => {
  it('handles a performance control through the existing message listener', () => {
    const handleExtensionMessage = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);
    const perfBridge = { handleControl: vi.fn(() => true) };
    const handler = createMessageHandler(
      vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue(),
      { deliverMessage: vi.fn() } as unknown as WebviewPluginHost,
      undefined,
      undefined,
      perfBridge,
    );
    const message: PerfControlMessage = {
      type: 'PERF_CONTROL',
      payload: {
        kind: 'arm-graph',
        operation: {
          dimension: 'medium',
          operationId: 'operation-1',
          runId: 'run-1',
          scenario: 'single-save',
        },
      },
    };

    handler({ data: message } as MessageEvent<unknown>);

    expect(perfBridge.handleControl).toHaveBeenCalledWith(message);
    expect(handleExtensionMessage).not.toHaveBeenCalled();
  });

  it('does not consult the performance bridge for ordinary extension messages', () => {
    const handleExtensionMessage = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);
    const perfBridge = { handleControl: vi.fn(() => false) };
    const handler = createMessageHandler(
      vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue(),
      { deliverMessage: vi.fn() } as unknown as WebviewPluginHost,
      undefined,
      undefined,
      perfBridge,
    );
    const message = { type: 'CACHE_INVALIDATED' as const };

    handler({ data: message } as MessageEvent<unknown>);

    expect(perfBridge.handleControl).not.toHaveBeenCalled();
    expect(handleExtensionMessage).toHaveBeenCalledWith(message);
  });
});
