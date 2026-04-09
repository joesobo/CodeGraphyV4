import { describe, expect, it, vi } from 'vitest';
import {
  initializeGraphViewProviderServices,
  restoreGraphViewProviderState,
} from '../../../../../src/extension/graphView/provider/wiring/bootstrap';

describe('graph view provider bootstrap helper', () => {
  it('registers core views, configures analyzer services, and forwards decoration updates', () => {
    const graphData = {
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
      edges: [],
    };
    const register = vi.fn();
    const setEventBus = vi.fn();
    const configureV2 = vi.fn();
    const registerCommand = vi.fn(() => ({ dispose: vi.fn() }));
    const pushSubscription = vi.fn();
    const sendMessage = vi.fn();
    const onDecorationsChanged = vi.fn();
    let decorationsChangedHandler: (() => void) | undefined;

    initializeGraphViewProviderServices({
      analyzer: {
        setEventBus,
        registry: { configureV2 },
      },
      viewRegistry: {
        register,
        get: vi.fn(() => undefined),
        getDefaultViewId: vi.fn(() => 'codegraphy.connections'),
      },
      coreViews: [
        { id: 'codegraphy.connections' },
      ],
      eventBus: { id: 'event-bus' },
      decorationManager: {
        onDecorationsChanged: handler => {
          decorationsChangedHandler = handler;
        },
      },
      getGraphData: () => graphData,
      registerCommand,
      pushSubscription,
      sendMessage,
      workspaceRoot: '/workspace',
      onDecorationsChanged,
    });

    expect(register).toHaveBeenNthCalledWith(
      1,
      { id: 'codegraphy.connections' },
      { core: true, isDefault: true },
    );
    expect(setEventBus).toHaveBeenCalledWith({ id: 'event-bus' });

    const registration = configureV2.mock.calls[0]?.[0];
    expect(registration.workspaceRoot).toBe('/workspace');
    expect(registration.graphProvider()).toBe(graphData);

    const action = vi.fn();
    registration.commandRegistrar('plugin.command', action);
    const disposable = registerCommand.mock.results[0]?.value;
    expect(registerCommand).toHaveBeenCalledWith('plugin.command', action);
    expect(pushSubscription).toHaveBeenCalledWith(disposable);

    registration.webviewSender({ type: 'PLUGIN_MESSAGE' });
    expect(sendMessage).toHaveBeenCalledWith({ type: 'PLUGIN_MESSAGE' });

    decorationsChangedHandler?.();
    expect(onDecorationsChanged).toHaveBeenCalledOnce();
  });

  it('restores persisted modes', () => {
    const configuration = {
      get<T>(key: string, defaultValue: T): T {
        if (key === 'dag') return 'horizontal' as T;
        if (key === 'size') return 'visits' as T;
        return defaultValue;
      },
    };

    expect(
      restoreGraphViewProviderState({
        configuration,
        dagModeKey: 'dag',
        nodeSizeModeKey: 'size',
        depthModeKey: 'depth',
        fallbackNodeSizeMode: 'connections',
      }),
    ).toEqual({
      depthMode: false,
      dagMode: 'horizontal',
      nodeSizeMode: 'visits',
    });
  });

  it('falls back to the default node size mode when persisted values are unavailable', () => {
    expect(
      restoreGraphViewProviderState({
        configuration: {
          get<T>(key: string, defaultValue: T): T {
            return defaultValue;
          },
        },
        dagModeKey: 'dag',
        nodeSizeModeKey: 'size',
        depthModeKey: 'depth',
        fallbackNodeSizeMode: 'connections',
      }),
    ).toEqual({
      depthMode: false,
      dagMode: null,
      nodeSizeMode: 'connections',
    });
  });
});
