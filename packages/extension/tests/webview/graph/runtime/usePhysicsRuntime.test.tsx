import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';
import {
  usePhysicsRuntime,
} from '../../../../src/webview/components/graph/runtime/use/graph/physics';

const physicsHarness = vi.hoisted(() => ({
  applyPhysicsSettings: vi.fn(),
  havePhysicsSettingsChanged: vi.fn(),
  initPhysics: vi.fn(),
  syncPhysicsAnimation: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/runtime/physics', () => ({
  applyPhysicsSettings: physicsHarness.applyPhysicsSettings,
  havePhysicsSettingsChanged: physicsHarness.havePhysicsSettingsChanged,
  initPhysics: physicsHarness.initPhysics,
  syncPhysicsAnimation: physicsHarness.syncPhysicsAnimation,
}));

const SETTINGS: IPhysicsSettings = {
  centerForce: 0.1,
  damping: 0.7,
  linkDistance: 120,
  linkForce: 0.4,
  repelForce: 500,
};

type UsePhysicsRuntimeOptions = Parameters<typeof usePhysicsRuntime>[0];
type Graph2DCurrent = UsePhysicsRuntimeOptions['fg2dRef']['current'];
type Graph3DCurrent = UsePhysicsRuntimeOptions['fg3dRef']['current'];

function create2DGraph(): Graph2DCurrent {
  return {} as Graph2DCurrent;
}

function create3DGraph(): Graph3DCurrent {
  return {
    d3Force: vi.fn().mockReturnValue({}),
    getGraphBbox: vi.fn().mockReturnValue({ x: [0, 1], y: [0, 1], z: [0, 1] }),
  } as Graph3DCurrent;
}

function havePhysicsChanged(
  previous: IPhysicsSettings | null,
  next: IPhysicsSettings,
): boolean {
  return previous === null
    || previous.centerForce !== next.centerForce
    || previous.damping !== next.damping
    || previous.linkDistance !== next.linkDistance
    || previous.linkForce !== next.linkForce
    || previous.repelForce !== next.repelForce;
}

describe('usePhysicsRuntime', () => {
  beforeEach(() => {
    physicsHarness.applyPhysicsSettings.mockReset();
    physicsHarness.havePhysicsSettingsChanged.mockReset();
    physicsHarness.initPhysics.mockReset();
    physicsHarness.syncPhysicsAnimation.mockReset();
    physicsHarness.havePhysicsSettingsChanged.mockReturnValue(false);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('does not check for setting changes before initialization completes', () => {
    renderHook(() => usePhysicsRuntime({
      fg2dRef: { current: create2DGraph() },
      fg3dRef: { current: undefined },
      graphMode: '2d',
      layoutKey: 'layout:a',
      physicsSettings: SETTINGS,
    }));

    expect(physicsHarness.havePhysicsSettingsChanged).not.toHaveBeenCalled();
  });

  it('initializes the active graph instance', () => {
    const graph = create2DGraph();

    renderHook(() => usePhysicsRuntime({
      fg2dRef: { current: graph },
      fg3dRef: { current: undefined },
      graphMode: '2d',
      layoutKey: 'layout:a',
      physicsSettings: SETTINGS,
    }));

    expect(physicsHarness.initPhysics).toHaveBeenCalledWith(graph, SETTINGS);
  });

  it('retries deferred initialization until the graph becomes available', () => {
    const frames: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const fg2dRef = { current: undefined as Graph2DCurrent };
    const { rerender } = renderHook(
      ({ physicsSettings }) => usePhysicsRuntime({
        fg2dRef,
        fg3dRef: { current: undefined },
        graphMode: '2d',
        layoutKey: 'layout:a',
        physicsSettings,
      }),
      { initialProps: { physicsSettings: SETTINGS } },
    );

    expect(physicsHarness.initPhysics).not.toHaveBeenCalled();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    act(() => {
      frames.shift()?.(0);
    });

    expect(physicsHarness.initPhysics).not.toHaveBeenCalled();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);

    const updatedSettings = {
      ...SETTINGS,
      damping: SETTINGS.damping + 0.1,
    };

    fg2dRef.current = create2DGraph();
    rerender({ physicsSettings: updatedSettings });

    act(() => {
      frames.shift()?.(16);
    });

    expect(physicsHarness.initPhysics).toHaveBeenCalledOnce();
    expect(physicsHarness.initPhysics).toHaveBeenCalledWith(fg2dRef.current, updatedSettings);
  });

  it('cancels a pending animation frame during cleanup', () => {
    const cancelAnimationFrame = vi.fn();

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 42));
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);

    const { unmount } = renderHook(() => usePhysicsRuntime({
      fg2dRef: { current: undefined },
      fg3dRef: { current: undefined },
      graphMode: '2d',
      layoutKey: 'layout:a',
      physicsSettings: SETTINGS,
    }));

    unmount();

    expect(physicsHarness.initPhysics).not.toHaveBeenCalled();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });

  it('does not cancel an animation frame when initialization completed synchronously', () => {
    const cancelAnimationFrame = vi.fn();

    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);

    const { unmount } = renderHook(() => usePhysicsRuntime({
      fg2dRef: { current: create2DGraph() },
      fg3dRef: { current: undefined },
      graphMode: '2d',
      layoutKey: 'layout:a',
      physicsSettings: SETTINGS,
    }));

    unmount();

    expect(cancelAnimationFrame).not.toHaveBeenCalled();
  });

  it('does not reapply settings when they are unchanged after initialization', () => {
    const graph = create2DGraph();

    const { rerender } = renderHook(
      ({ physicsSettings }) => usePhysicsRuntime({
        fg2dRef: { current: graph },
        fg3dRef: { current: undefined },
        graphMode: '2d',
        layoutKey: 'layout:a',
        physicsSettings,
      }),
      { initialProps: { physicsSettings: SETTINGS } },
    );

    const sameSettings = { ...SETTINGS };
    rerender({ physicsSettings: sameSettings });

    expect(physicsHarness.havePhysicsSettingsChanged).toHaveBeenCalledWith(
      expect.objectContaining(SETTINGS),
      sameSettings,
    );
    expect(physicsHarness.applyPhysicsSettings).not.toHaveBeenCalled();
  });

  it('tracks the latest settings snapshot after applying a change', () => {
    const graph = create2DGraph();
    const updatedSettings = {
      ...SETTINGS,
      repelForce: SETTINGS.repelForce + 1,
    };

    physicsHarness.havePhysicsSettingsChanged.mockImplementation(havePhysicsChanged);

    const { rerender } = renderHook(
      ({ physicsSettings }) => usePhysicsRuntime({
        fg2dRef: { current: graph },
        fg3dRef: { current: undefined },
        graphMode: '2d',
        layoutKey: 'layout:a',
        physicsSettings,
      }),
      { initialProps: { physicsSettings: SETTINGS } },
    );

    rerender({ physicsSettings: updatedSettings });
    rerender({ physicsSettings: { ...updatedSettings } });

    expect(physicsHarness.havePhysicsSettingsChanged).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining(SETTINGS),
      updatedSettings,
    );
    expect(physicsHarness.havePhysicsSettingsChanged).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining(updatedSettings),
      expect.objectContaining(updatedSettings),
    );
    expect(physicsHarness.applyPhysicsSettings).toHaveBeenCalledOnce();
    expect(physicsHarness.applyPhysicsSettings).toHaveBeenCalledWith(graph, updatedSettings);
  });

  it('reapplies settings after initialization when values change', () => {
    const graph = create2DGraph();
    physicsHarness.havePhysicsSettingsChanged.mockReturnValue(true);

    const updatedSettings = {
      ...SETTINGS,
      repelForce: SETTINGS.repelForce + 1,
    };

    const { rerender } = renderHook(
      ({ physicsSettings }) => usePhysicsRuntime({
        fg2dRef: { current: graph },
        fg3dRef: { current: undefined },
        graphMode: '2d',
        layoutKey: 'layout:a',
        physicsSettings,
      }),
      { initialProps: { physicsSettings: SETTINGS } },
    );

    rerender({ physicsSettings: updatedSettings });

    expect(physicsHarness.havePhysicsSettingsChanged).toHaveBeenCalledWith(
      expect.objectContaining(SETTINGS),
      updatedSettings,
    );
    expect(physicsHarness.applyPhysicsSettings).toHaveBeenCalledWith(graph, updatedSettings);
  });

  it('reinitializes physics when the graph mode changes', () => {
    const graph2D = create2DGraph();
    const graph3D = create3DGraph();
    const frames: FrameRequestCallback[] = [];

    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const { rerender } = renderHook(
      ({ graphMode }: { graphMode: '2d' | '3d' }) => usePhysicsRuntime({
        fg2dRef: { current: graph2D },
        fg3dRef: { current: graph3D },
        graphMode,
        layoutKey: 'layout:a',
        physicsSettings: SETTINGS,
      }),
      { initialProps: { graphMode: '2d' as const } },
    );

    rerender({ graphMode: '3d' as never });

    expect(physicsHarness.initPhysics).toHaveBeenNthCalledWith(1, graph2D, SETTINGS);
    expect(physicsHarness.initPhysics).toHaveBeenCalledTimes(1);

    act(() => {
      frames.shift()?.(16);
    });

    act(() => {
      frames.shift()?.(32);
    });

    expect(physicsHarness.initPhysics).toHaveBeenNthCalledWith(2, graph3D, SETTINGS);
  });

  it('syncs pause and resume requests to the active graph', () => {
    const graph = create2DGraph();

    const { rerender } = renderHook(
      ({ physicsPaused }: { physicsPaused: boolean }) => usePhysicsRuntime({
        fg2dRef: { current: graph },
        fg3dRef: { current: undefined },
        graphMode: '2d',
        layoutKey: 'layout:a',
        physicsPaused,
        physicsSettings: SETTINGS,
      }),
      { initialProps: { physicsPaused: false } },
    );

    rerender({ physicsPaused: true });

    expect(physicsHarness.syncPhysicsAnimation).toHaveBeenCalledOnce();
    expect(physicsHarness.syncPhysicsAnimation).toHaveBeenCalledWith(graph, true);
  });

  it('syncs the active graph immediately when initialization completes in a paused state', () => {
    const graph = create3DGraph();
    const frames: FrameRequestCallback[] = [];

    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    renderHook(() => usePhysicsRuntime({
      fg2dRef: { current: undefined },
      fg3dRef: { current: graph },
      graphMode: '3d',
      layoutKey: 'layout:a',
      physicsPaused: true,
      physicsSettings: SETTINGS,
    }));

    expect(physicsHarness.initPhysics).not.toHaveBeenCalled();
    expect(physicsHarness.syncPhysicsAnimation).not.toHaveBeenCalled();

    act(() => {
      frames.shift()?.(16);
    });

    act(() => {
      frames.shift()?.(32);
    });

    expect(physicsHarness.initPhysics).toHaveBeenCalledWith(graph, SETTINGS);
    expect(physicsHarness.syncPhysicsAnimation).toHaveBeenCalledOnce();
    expect(physicsHarness.syncPhysicsAnimation).toHaveBeenCalledWith(graph, true);
  });

  it('reheats the graph when the layout key changes', () => {
    const graph = create2DGraph();

    const { rerender } = renderHook(
      ({ layoutKey }: { layoutKey: string }) => usePhysicsRuntime({
        fg2dRef: { current: graph },
        fg3dRef: { current: undefined },
        graphMode: '2d',
        layoutKey,
        physicsSettings: SETTINGS,
      }),
      { initialProps: { layoutKey: 'layout:a' } },
    );

    rerender({ layoutKey: 'layout:b' });

    expect(physicsHarness.applyPhysicsSettings).toHaveBeenCalledOnce();
    expect(physicsHarness.applyPhysicsSettings).toHaveBeenCalledWith(graph, SETTINGS);
  });
});
