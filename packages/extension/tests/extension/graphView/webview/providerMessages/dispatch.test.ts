import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GraphViewMessageListenerContext } from '../../../../../src/extension/graphView/webview/messages/listener';

type DispatchHarness = {
  context: GraphViewMessageListenerContext;
  createContext: ReturnType<typeof vi.fn>;
  dispatchPrimary: ReturnType<typeof vi.fn>;
  dispatchPlugin: ReturnType<typeof vi.fn>;
  dispatchGraphViewProviderMessage: typeof import('../../../../../src/extension/graphView/webview/providerMessages/dispatch').dispatchGraphViewProviderMessage;
};

async function loadDispatchHarness({
  primaryResult,
  pluginResult,
}: {
  primaryResult: { handled: boolean; userGroups?: unknown; filterPatterns?: string[] };
  pluginResult: { handled: boolean; readyNotified?: boolean };
}): Promise<DispatchHarness> {
  vi.resetModules();

  const context = {
    setUserGroups: vi.fn(),
    recomputeGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    setFilterPatterns: vi.fn(),
    setWebviewReadyNotified: vi.fn(),
  } as unknown as GraphViewMessageListenerContext;

  const createContext = vi.fn(() => context);
  const dispatchPrimary = vi.fn(async () => primaryResult);
  const dispatchPlugin = vi.fn(async () => pluginResult);

  vi.doMock('../../../../../src/extension/graphView/webview/providerMessages/context', () => ({
    createGraphViewProviderMessageContext: createContext,
  }));
  vi.doMock('../../../../../src/extension/graphView/webview/dispatch/primary', () => ({
    dispatchGraphViewPrimaryMessage: dispatchPrimary,
  }));
  vi.doMock('../../../../../src/extension/graphView/webview/dispatch/plugin', () => ({
    dispatchGraphViewPluginMessage: dispatchPlugin,
  }));

  const { dispatchGraphViewProviderMessage } = await import(
    '../../../../../src/extension/graphView/webview/providerMessages/dispatch'
  );

  return {
    context,
    createContext,
    dispatchPrimary,
    dispatchPlugin,
    dispatchGraphViewProviderMessage,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('graph view provider message dispatch', () => {
  it('updates user groups and filter patterns from a handled primary message', async () => {
    const userGroups = [{ id: 'user:src', pattern: 'src/**', color: '#112233' }];
    const harness = await loadDispatchHarness({
      primaryResult: { handled: true, userGroups, filterPatterns: ['dist/**'] },
      pluginResult: { handled: false },
    });

    await harness.dispatchGraphViewProviderMessage({ type: 'UPDATE_LEGENDS' } as never, {} as never, {} as never);

    expect(harness.createContext).toHaveBeenCalledOnce();
    expect(harness.dispatchPrimary).toHaveBeenCalledWith(
      { type: 'UPDATE_LEGENDS' },
      harness.context,
    );
    expect(harness.context.setUserGroups).toHaveBeenCalledWith(userGroups);
    expect(harness.context.recomputeGroups).toHaveBeenCalledOnce();
    expect(harness.context.sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(harness.context.setFilterPatterns).toHaveBeenCalledWith(['dist/**']);
    expect(harness.dispatchPlugin).not.toHaveBeenCalled();
  });

  it('skips group update side effects when a handled primary message omits optional fields', async () => {
    const harness = await loadDispatchHarness({
      primaryResult: { handled: true },
      pluginResult: { handled: false },
    });

    await harness.dispatchGraphViewProviderMessage({ type: 'REFRESH_GRAPH' } as never, {} as never, {} as never);

    expect(harness.context.setUserGroups).not.toHaveBeenCalled();
    expect(harness.context.recomputeGroups).not.toHaveBeenCalled();
    expect(harness.context.sendGroupsUpdated).not.toHaveBeenCalled();
    expect(harness.context.setFilterPatterns).not.toHaveBeenCalled();
    expect(harness.dispatchPlugin).not.toHaveBeenCalled();
  });

  it('stores ready state from a handled plugin message when primary dispatch does not handle the message', async () => {
    const harness = await loadDispatchHarness({
      primaryResult: { handled: false },
      pluginResult: { handled: true, readyNotified: true },
    });

    await harness.dispatchGraphViewProviderMessage({ type: 'WEBVIEW_READY' } as never, {} as never, {} as never);

    expect(harness.dispatchPlugin).toHaveBeenCalledWith(
      { type: 'WEBVIEW_READY' },
      harness.context,
    );
    expect(harness.context.setWebviewReadyNotified).toHaveBeenCalledWith(true);
  });

  it('ignores plugin ready updates when the plugin result is unhandled or omits ready state', async () => {
    const unhandledHarness = await loadDispatchHarness({
      primaryResult: { handled: false },
      pluginResult: { handled: false, readyNotified: true },
    });

    await unhandledHarness.dispatchGraphViewProviderMessage({ type: 'PLUGIN_MESSAGE' } as never, {} as never, {} as never);

    expect(unhandledHarness.context.setWebviewReadyNotified).not.toHaveBeenCalled();

    const missingReadyHarness = await loadDispatchHarness({
      primaryResult: { handled: false },
      pluginResult: { handled: true },
    });

    await missingReadyHarness.dispatchGraphViewProviderMessage({ type: 'PLUGIN_MESSAGE' } as never, {} as never, {} as never);

    expect(missingReadyHarness.context.setWebviewReadyNotified).not.toHaveBeenCalled();
  });
});
