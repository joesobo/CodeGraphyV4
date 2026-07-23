import { describe, expect, it, vi } from 'vitest';
import {
  initializeGraphViewProviderServices,
  restoreGraphViewProviderState,
} from '../../../../../src/extension/graphView/provider/wiring/bootstrap';

describe('graph view provider bootstrap helper', () => {
  it('registers core views, configures Extension services, and forwards decoration updates', () => {
    const register = vi.fn();
    const setEventBus = vi.fn();
    const onDecorationsChanged = vi.fn();
    let decorationsChangedHandler: (() => void) | undefined;

    initializeGraphViewProviderServices({
      analyzer: {
        setEventBus,
      },
      viewRegistry: {
        register,
        get: vi.fn(() => undefined),
        getDefaultViewId: vi.fn(() => 'codegraphy.graph'),
      },
      coreViews: [
        { id: 'codegraphy.graph' },
      ],
      eventBus: { id: 'event-bus' },
      decorationManager: {
        onDecorationsChanged: handler => {
          decorationsChangedHandler = handler;
        },
      },
      onDecorationsChanged,
    });

    expect(register).toHaveBeenNthCalledWith(
      1,
      { id: 'codegraphy.graph' },
      { core: true, isDefault: true },
    );
    expect(setEventBus).toHaveBeenCalledWith({ id: 'event-bus' });

    decorationsChangedHandler?.();
    expect(onDecorationsChanged).toHaveBeenCalledOnce();
  });

  it('restores a current persisted node size mode', () => {
    const configuration = {
      get<T>(key: string, defaultValue: T): T {
        if (key === 'size') return 'file-size' as T;
        return defaultValue;
      },
    };

    expect(
      restoreGraphViewProviderState({
        configuration,
        nodeSizeModeKey: 'size',
        depthModeKey: 'depth',
        fallbackNodeSizeMode: 'connections',
      }),
    ).toEqual({
      depthMode: false,
      nodeSizeMode: 'file-size',
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
        nodeSizeModeKey: 'size',
        depthModeKey: 'depth',
        fallbackNodeSizeMode: 'connections',
      }),
    ).toEqual({
      depthMode: false,
      nodeSizeMode: 'connections',
    });
  });

  it.each(['access-count', 'churn', 'uniform', 'unexpected'])('%s falls back to Connections', (persistedMode) => {
    expect(
      restoreGraphViewProviderState({
        configuration: {
          get<T>(key: string, defaultValue: T): T {
            return key === 'size' ? persistedMode as T : defaultValue;
          },
        },
        nodeSizeModeKey: 'size',
        depthModeKey: 'depth',
        fallbackNodeSizeMode: 'connections',
      }),
    ).toEqual({
      depthMode: false,
      nodeSizeMode: 'connections',
    });
  });

  it('uses the default depth mode key when no custom depth key is provided', () => {
    expect(
      restoreGraphViewProviderState({
        configuration: {
          get<T>(key: string, defaultValue: T): T {
            if (key === 'depthMode') {
              return true as T;
            }
            return defaultValue;
          },
        },
        nodeSizeModeKey: 'size',
        fallbackNodeSizeMode: 'connections',
      }),
    ).toEqual({
      depthMode: true,
      nodeSizeMode: 'connections',
    });
  });
});
