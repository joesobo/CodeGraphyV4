import { describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../../../src/shared/settings/groups';
import {
  setGraphViewWebviewMessageListener,
} from '../../../../../src/extension/graphView/webview/messages/listener';
import { createContext } from './listener/fixture';

describe('graph view webview message listener', () => {
  it('stores user group updates from primary dispatch flows', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const userGroups: IGroup[] = [{ id: 'user:src', pattern: 'src/**', color: '#112233' }];
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({ type: 'UPDATE_LEGENDS', payload: { legends: userGroups } });

    expect(context.setUserGroups).toHaveBeenCalledWith(userGroups);
    expect(context.setFilterPatterns).not.toHaveBeenCalled();
    expect(context.setWebviewReadyNotified).not.toHaveBeenCalled();
  });

  it('recomputes and sends groups after storing user group updates', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const userGroups: IGroup[] = [{ id: 'user:docs', pattern: 'docs/**', color: '#445566' }];
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({ type: 'UPDATE_LEGENDS', payload: { legends: userGroups } });

    expect(context.setUserGroups).toHaveBeenCalledWith(userGroups);
    expect(context.recomputeGroups).toHaveBeenCalledTimes(1);
    expect(context.sendGroupsUpdated).toHaveBeenCalledTimes(1);
  });

  it('stores filter pattern updates from primary dispatch flows', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['dist/**'] },
    });

    expect(context.setFilterPatterns).toHaveBeenCalledWith(['dist/**']);
    expect(context.analyzeAndSendData).not.toHaveBeenCalled();
    expect(context.setUserGroups).not.toHaveBeenCalled();
    expect(context.setWebviewReadyNotified).not.toHaveBeenCalled();
  });

  it('does not reanalyze the graph for unrelated settings updates', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({
      type: 'UPDATE_SHOW_ORPHANS',
      payload: { showOrphans: false },
    });

    expect(context.analyzeAndSendData).not.toHaveBeenCalled();
    expect(context.setFilterPatterns).not.toHaveBeenCalled();
  });

  it('stores ready state updates from plugin dispatch flows', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({ type: 'WEBVIEW_READY' });

    expect(context.setWebviewReadyNotified).toHaveBeenCalledWith(true);
  });

  it('does not replay settings or empty bootstrap payloads for duplicate WEBVIEW_READY during first analysis', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    let readyNotified = false;
    const context = createContext({
      hasWorkspace: vi.fn(() => true),
      isFirstAnalysis: vi.fn(() => true),
      isWebviewReadyNotified: vi.fn(() => readyNotified),
      setWebviewReadyNotified: vi.fn((nextValue: boolean) => {
        readyNotified = nextValue;
      }),
    });

    setGraphViewWebviewMessageListener(webview as never, context);
    const firstReady = messageHandler?.({ type: 'WEBVIEW_READY' });
    await Promise.resolve();
    const duplicateReady = messageHandler?.({ type: 'WEBVIEW_READY' });

    await Promise.resolve();

    expect(
      vi.mocked(context.sendMessage).mock.calls.filter(([message]) =>
        (message as { type?: string }).type === 'GRAPH_DATA_UPDATED'
      ),
    ).toHaveLength(0);
    expect(
      vi.mocked(context.sendMessage).mock.calls.filter(([message]) =>
        (message as { type?: string }).type === 'APP_BOOTSTRAP_COMPLETE'
      ),
    ).toHaveLength(0);

    await firstReady;
    await duplicateReady;

    expect(context.loadAndSendData).toHaveBeenCalledTimes(1);
    expect(context.sendMessage).toHaveBeenCalledWith({
      type: 'APP_BOOTSTRAP_COMPLETE',
    });
    expect(
      vi.mocked(context.sendMessage).mock.calls.filter(([message]) =>
        (message as { type?: string }).type === 'GRAPH_DATA_UPDATED'
      ),
    ).toHaveLength(0);
    expect(context.loadGroupsAndFilterPatterns).toHaveBeenCalledTimes(2);
    expect(context.loadDisabledRulesAndPlugins).toHaveBeenCalledTimes(2);
    expect(context.sendSettings).toHaveBeenCalledTimes(2);
    expect(context.sendPhysicsSettings).toHaveBeenCalledTimes(2);
    expect(context.notifyWebviewReady).toHaveBeenCalledTimes(1);
    expect(context.setWebviewReadyNotified).toHaveBeenCalledWith(true);
    expect(context.setWebviewReadyNotified).toHaveBeenCalledTimes(1);
  });

  it('ignores repeated WEBVIEW_READY deliveries from the same webview page after bootstrap', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const context = createContext({
      hasWorkspace: vi.fn(() => true),
      isFirstAnalysis: vi.fn(() => false),
      isWebviewReadyNotified: vi.fn(() => true),
    });
    const readyMessage = { type: 'WEBVIEW_READY', payload: { pageId: 'page-a' } };

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.(readyMessage);
    await messageHandler?.(readyMessage);

    expect(context.loadAndSendData).toHaveBeenCalledTimes(1);
    expect(context.sendSettings).toHaveBeenCalledTimes(1);
    expect(context.sendPhysicsSettings).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(context.sendMessage).mock.calls.filter(([message]) =>
        (message as { type?: string }).type === 'APP_BOOTSTRAP_COMPLETE'
      ),
    ).toHaveLength(1);
  });

  it('ignores new-page WEBVIEW_READY deliveries posted before the previous bootstrap completed', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const context = createContext({
      hasWorkspace: vi.fn(() => true),
      isFirstAnalysis: vi.fn(() => false),
      isWebviewReadyNotified: vi.fn(() => true),
    });

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({ type: 'WEBVIEW_READY', payload: { pageId: 'page-a', postedAt: 1 } });
    await messageHandler?.({ type: 'WEBVIEW_READY', payload: { pageId: 'page-b', postedAt: 1 } });

    expect(context.loadAndSendData).toHaveBeenCalledTimes(1);
    expect(context.sendSettings).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(context.sendMessage).mock.calls.filter(([message]) =>
        (message as { type?: string }).type === 'APP_BOOTSTRAP_COMPLETE'
      ),
    ).toHaveLength(1);
  });

  it('replaces the previous listener when the same webview is wired again', async () => {
    const activeHandlers = new Set<(message: unknown) => Promise<void>>();
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        activeHandlers.add(handler);
        return {
          dispose: () => {
            activeHandlers.delete(handler);
          },
        };
      }),
    };
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    setGraphViewWebviewMessageListener(webview as never, context);

    expect(activeHandlers.size).toBe(1);

    await Promise.all(
      [...activeHandlers].map(handler => handler({ type: 'REFRESH_GRAPH' })),
    );

    expect(context.refreshIndex).toHaveBeenCalledTimes(1);
    expect(context.clearCacheAndRefresh).not.toHaveBeenCalled();
  });

  it('does not store ready state for handled plugin messages without a ready flag', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({
      type: 'GRAPH_INTERACTION',
      payload: {
        event: 'nodeClick',
        data: { pluginId: 'plugin.test', nodeId: 'src/index.ts' },
      },
    });

    expect(context.emitEvent).toHaveBeenCalledWith('nodeClick', {
      pluginId: 'plugin.test',
      nodeId: 'src/index.ts',
    });
    expect(context.setWebviewReadyNotified).not.toHaveBeenCalled();
  });

  it('ignores messages not handled by the primary or plugin dispatchers', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({ type: 'NOT_A_REAL_MESSAGE' } as never);

    expect(context.setUserGroups).not.toHaveBeenCalled();
    expect(context.setFilterPatterns).not.toHaveBeenCalled();
    expect(context.setWebviewReadyNotified).not.toHaveBeenCalled();
  });
});
