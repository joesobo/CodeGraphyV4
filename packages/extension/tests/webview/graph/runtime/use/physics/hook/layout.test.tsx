import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../../../../src/shared/settings/physics';
import {
  usePhysicsRuntimeLayoutKey,
  usePhysicsRuntimeLayoutReset,
} from '../../../../../../../src/webview/components/graph/runtime/use/physics/hook/layout';

const physicsHarness = vi.hoisted(() => ({
  applyPhysicsSettings: vi.fn(),
  havePhysicsSettingsChanged: vi.fn(),
  selectActivePhysicsGraph: vi.fn(),
  syncPhysicsAnimation: vi.fn(),
}));

vi.mock('../../../../../../../src/webview/components/graph/runtime/physics', () => ({
  applyPhysicsSettings: physicsHarness.applyPhysicsSettings,
  havePhysicsSettingsChanged: physicsHarness.havePhysicsSettingsChanged,
  syncPhysicsAnimation: physicsHarness.syncPhysicsAnimation,
}));

vi.mock('../../../../../../../src/webview/components/graph/runtime/physicsLifecycle/readiness', () => ({
  selectActivePhysicsGraph: physicsHarness.selectActivePhysicsGraph,
}));

const SETTINGS: IPhysicsSettings = {
  centerForce: 0.1,
  damping: 0.7,
  linkDistance: 120,
  linkForce: 0.4,
  repelForce: 500,
};

describe('webview/graph/runtime/use/physics/layout', () => {
  beforeEach(() => {
    physicsHarness.applyPhysicsSettings.mockReset();
    physicsHarness.havePhysicsSettingsChanged.mockReset();
    physicsHarness.selectActivePhysicsGraph.mockReset();
    physicsHarness.syncPhysicsAnimation.mockReset();
  });

  it('reapplies settings when the layout key changes after initialization', () => {
    const graph = {} as never;
    physicsHarness.selectActivePhysicsGraph.mockReturnValue(graph);

    const refs = {
      fg2dRef: { current: graph },
      fg3dRef: { current: undefined },
      graphMode: '2d' as const,
      layoutKey: 'layout:a',
      physicsPaused: true,
      physicsInitialisedRef: { current: true },
      physicsSettingsRef: { current: SETTINGS },
      pendingThreeDimensionalInitRef: { current: false },
      previousLayoutKeyRef: { current: null as string | null },
      previousPhysicsRef: { current: null as IPhysicsSettings | null },
    };

    const { rerender } = renderHook(
      ({ layoutKey }: { layoutKey: string }) => usePhysicsRuntimeLayoutKey({
        ...refs,
        layoutKey,
      }),
      { initialProps: { layoutKey: 'layout:a' } },
    );

    rerender({ layoutKey: 'layout:b' });

    expect(physicsHarness.applyPhysicsSettings).toHaveBeenCalledWith(graph, SETTINGS);
    expect(physicsHarness.syncPhysicsAnimation).toHaveBeenCalledWith(graph, true);
  });

  it('reapplies settings without pausing when physics is not paused', () => {
    const graph = {} as never;
    physicsHarness.selectActivePhysicsGraph.mockReturnValue(graph);

    const refs = {
      fg2dRef: { current: graph },
      fg3dRef: { current: undefined },
      graphMode: '2d' as const,
      layoutKey: 'layout:a',
      physicsPaused: false,
      physicsInitialisedRef: { current: true },
      physicsSettingsRef: { current: SETTINGS },
      pendingThreeDimensionalInitRef: { current: false },
      previousLayoutKeyRef: { current: null as string | null },
      previousPhysicsRef: { current: null as IPhysicsSettings | null },
    };

    const { rerender } = renderHook(
      ({ layoutKey }: { layoutKey: string }) => usePhysicsRuntimeLayoutKey({
        ...refs,
        layoutKey,
      }),
      { initialProps: { layoutKey: 'layout:a' } },
    );

    rerender({ layoutKey: 'layout:b' });

    expect(physicsHarness.applyPhysicsSettings).toHaveBeenCalledWith(graph, SETTINGS);
    expect(physicsHarness.syncPhysicsAnimation).not.toHaveBeenCalled();
  });

  it('captures the first layout key without reapplying settings', () => {
    const graph = {} as never;
    physicsHarness.selectActivePhysicsGraph.mockReturnValue(graph);

    const refs = {
      fg2dRef: { current: graph },
      fg3dRef: { current: undefined },
      graphMode: '2d' as const,
      layoutKey: 'layout:a',
      physicsPaused: false,
      physicsInitialisedRef: { current: true },
      physicsSettingsRef: { current: SETTINGS },
      pendingThreeDimensionalInitRef: { current: false },
      previousLayoutKeyRef: { current: null as string | null },
      previousPhysicsRef: { current: null as IPhysicsSettings | null },
    };

    renderHook(() => usePhysicsRuntimeLayoutKey(refs));

    expect(refs.previousLayoutKeyRef.current).toBe('layout:a');
    expect(physicsHarness.applyPhysicsSettings).not.toHaveBeenCalled();
    expect(physicsHarness.syncPhysicsAnimation).not.toHaveBeenCalled();
  });

  it('does not reapply settings when the layout key stays the same', () => {
    const graph = {} as never;
    physicsHarness.selectActivePhysicsGraph.mockReturnValue(graph);

    const refs = {
      fg2dRef: { current: graph },
      fg3dRef: { current: undefined },
      graphMode: '2d' as const,
      layoutKey: 'layout:a',
      physicsPaused: false,
      physicsInitialisedRef: { current: true },
      physicsSettingsRef: { current: SETTINGS },
      pendingThreeDimensionalInitRef: { current: false },
      previousLayoutKeyRef: { current: 'layout:a' as string | null },
      previousPhysicsRef: { current: null as IPhysicsSettings | null },
    };

    const { rerender } = renderHook(
      ({ layoutKey }: { layoutKey: string }) => usePhysicsRuntimeLayoutKey({
        ...refs,
        layoutKey,
      }),
      { initialProps: { layoutKey: 'layout:a' } },
    );

    rerender({ layoutKey: 'layout:a' });

    expect(physicsHarness.applyPhysicsSettings).not.toHaveBeenCalled();
    expect(physicsHarness.syncPhysicsAnimation).not.toHaveBeenCalled();
  });

  it('resets runtime state when the graph mode changes', () => {
    const refs = {
      fg2dRef: { current: undefined },
      fg3dRef: { current: undefined },
      graphMode: '2d' as const,
      layoutKey: 'layout:a',
      physicsPaused: false,
      physicsInitialisedRef: { current: true },
      physicsSettingsRef: { current: SETTINGS },
      pendingThreeDimensionalInitRef: { current: false },
      previousLayoutKeyRef: { current: 'layout:a' as string | null },
      previousPhysicsRef: { current: SETTINGS as IPhysicsSettings | null },
    };

    const { rerender } = renderHook(
      ({ graphMode }: { graphMode: '2d' | '3d' }) => usePhysicsRuntimeLayoutReset({
        ...refs,
        graphMode,
      }),
      { initialProps: { graphMode: '2d' as '2d' | '3d' } },
    );

    rerender({ graphMode: '3d' });

    expect(refs.physicsInitialisedRef.current).toBe(false);
    expect(refs.pendingThreeDimensionalInitRef.current).toBe(true);
    expect(refs.previousLayoutKeyRef.current).toBeNull();
    expect(refs.previousPhysicsRef.current).toBeNull();
  });

  it('keeps deferred 3d init disabled in 2d mode', () => {
    const refs = {
      fg2dRef: { current: undefined },
      fg3dRef: { current: undefined },
      graphMode: '2d' as const,
      layoutKey: 'layout:a',
      physicsPaused: false,
      physicsInitialisedRef: { current: true },
      physicsSettingsRef: { current: SETTINGS },
      pendingThreeDimensionalInitRef: { current: true },
      previousLayoutKeyRef: { current: 'layout:a' as string | null },
      previousPhysicsRef: { current: SETTINGS as IPhysicsSettings | null },
    };

    renderHook(() => usePhysicsRuntimeLayoutReset(refs));

    expect(refs.pendingThreeDimensionalInitRef.current).toBe(false);
  });

  it('does not reapply settings when the graph is present but not initialized', () => {
    const graph = {} as never;
    physicsHarness.selectActivePhysicsGraph.mockReturnValue(graph);

    const refs = {
      fg2dRef: { current: graph },
      fg3dRef: { current: undefined },
      graphMode: '2d' as const,
      layoutKey: 'layout:a',
      physicsPaused: false,
      physicsInitialisedRef: { current: false },
      physicsSettingsRef: { current: SETTINGS },
      previousLayoutKeyRef: { current: null as string | null },
    };

    renderHook(() => usePhysicsRuntimeLayoutKey(refs));

    expect(physicsHarness.applyPhysicsSettings).not.toHaveBeenCalled();
    expect(physicsHarness.syncPhysicsAnimation).not.toHaveBeenCalled();
    expect(refs.previousLayoutKeyRef.current).toBeNull();
  });
});
