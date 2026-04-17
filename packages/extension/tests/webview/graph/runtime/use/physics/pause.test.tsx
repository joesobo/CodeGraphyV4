import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePhysicsRuntimePause } from '../../../../../../src/webview/components/graph/runtime/use/physics/pause';

const physicsHarness = vi.hoisted(() => ({
  havePhysicsSettingsChanged: vi.fn(),
  selectActivePhysicsGraph: vi.fn(),
  syncPhysicsAnimation: vi.fn(),
}));

vi.mock('../../../../../../src/webview/components/graph/runtime/physicsLifecycle/readiness', () => ({
  selectActivePhysicsGraph: physicsHarness.selectActivePhysicsGraph,
}));

vi.mock('../../../../../../src/webview/components/graph/runtime/physics', () => ({
  havePhysicsSettingsChanged: physicsHarness.havePhysicsSettingsChanged,
  syncPhysicsAnimation: physicsHarness.syncPhysicsAnimation,
}));

describe('webview/graph/runtime/use/physics/pause', () => {
  beforeEach(() => {
    physicsHarness.havePhysicsSettingsChanged.mockReset();
    physicsHarness.selectActivePhysicsGraph.mockReset();
    physicsHarness.syncPhysicsAnimation.mockReset();
  });

  it('syncs the active graph when physics pause changes', () => {
    const graph = {} as never;
    physicsHarness.selectActivePhysicsGraph.mockReturnValue(graph);

    const { rerender } = renderHook(
      ({ physicsPaused }: { physicsPaused: boolean }) => usePhysicsRuntimePause({
        fg2dRef: { current: graph },
        fg3dRef: { current: undefined },
        graphMode: '2d',
        physicsInitialisedRef: { current: true },
        physicsPaused,
      }),
      { initialProps: { physicsPaused: false } },
    );

    rerender({ physicsPaused: true });

    expect(physicsHarness.syncPhysicsAnimation).toHaveBeenCalledWith(graph, true);
  });

  it('does not sync before initialization completes', () => {
    physicsHarness.selectActivePhysicsGraph.mockReturnValue(undefined);

    renderHook(() => usePhysicsRuntimePause({
      fg2dRef: { current: undefined },
      fg3dRef: { current: undefined },
      graphMode: '2d',
      physicsInitialisedRef: { current: false },
      physicsPaused: true,
    }));

    expect(physicsHarness.syncPhysicsAnimation).not.toHaveBeenCalled();
  });

  it('does not sync when the active graph exists but initialization has not completed', () => {
    const graph = {} as never;
    physicsHarness.selectActivePhysicsGraph.mockReturnValue(graph);

    renderHook(() => usePhysicsRuntimePause({
      fg2dRef: { current: graph },
      fg3dRef: { current: undefined },
      graphMode: '2d',
      physicsInitialisedRef: { current: false },
      physicsPaused: true,
    }));

    expect(physicsHarness.syncPhysicsAnimation).not.toHaveBeenCalled();
  });
});
