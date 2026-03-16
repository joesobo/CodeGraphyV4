import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/types';
import { usePhysicsRuntime } from '../../../../src/webview/components/graph/runtime/usePhysicsRuntime';

const physicsHarness = vi.hoisted(() => ({
  applyPhysicsSettings: vi.fn(),
  havePhysicsSettingsChanged: vi.fn(),
  initPhysics: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/runtime/physics', () => ({
  applyPhysicsSettings: physicsHarness.applyPhysicsSettings,
  havePhysicsSettingsChanged: physicsHarness.havePhysicsSettingsChanged,
  initPhysics: physicsHarness.initPhysics,
}));

const SETTINGS: IPhysicsSettings = {
  centerForce: 0.1,
  damping: 0.7,
  linkDistance: 120,
  linkForce: 0.4,
  repelForce: 500,
};

describe('usePhysicsRuntime', () => {
  beforeEach(() => {
    physicsHarness.applyPhysicsSettings.mockReset();
    physicsHarness.havePhysicsSettingsChanged.mockReset();
    physicsHarness.initPhysics.mockReset();
    physicsHarness.havePhysicsSettingsChanged.mockReturnValue(false);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('initializes the active graph instance', () => {
    const graph = {};

    renderHook(() => usePhysicsRuntime({
      fg2dRef: { current: graph as unknown as Parameters<typeof usePhysicsRuntime>[0]['fg2dRef']['current'] },
      fg3dRef: { current: undefined },
      graphMode: '2d',
      physicsSettings: SETTINGS,
    }));

    expect(physicsHarness.initPhysics).toHaveBeenCalledWith(graph, SETTINGS);
  });

  it('reapplies settings after initialization when values change', () => {
    const graph = {};
    physicsHarness.havePhysicsSettingsChanged.mockReturnValue(true);

    const { rerender } = renderHook(
      ({ physicsSettings }) => usePhysicsRuntime({
        fg2dRef: { current: graph as unknown as Parameters<typeof usePhysicsRuntime>[0]['fg2dRef']['current'] },
        fg3dRef: { current: undefined },
        graphMode: '2d',
        physicsSettings,
      }),
      { initialProps: { physicsSettings: SETTINGS } },
    );

    rerender({
      physicsSettings: {
        ...SETTINGS,
        repelForce: SETTINGS.repelForce + 1,
      },
    });

    expect(physicsHarness.applyPhysicsSettings).toHaveBeenCalledWith(graph, {
      ...SETTINGS,
      repelForce: SETTINGS.repelForce + 1,
    });
  });
});
