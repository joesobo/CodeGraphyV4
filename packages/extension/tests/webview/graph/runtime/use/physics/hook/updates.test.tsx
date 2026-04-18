import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../../../../src/shared/settings/physics';

const physicsHarness = vi.hoisted(() => ({
  applyPhysicsSettings: vi.fn(),
  havePhysicsSettingsChanged: vi.fn(),
  selectActivePhysicsGraph: vi.fn(),
  shouldApplyPhysicsUpdate: vi.fn(),
}));

vi.mock('../../../../../../../src/webview/components/graph/runtime/physics', () => ({
  applyPhysicsSettings: physicsHarness.applyPhysicsSettings,
  havePhysicsSettingsChanged: physicsHarness.havePhysicsSettingsChanged,
}));

vi.mock('../../../../../../../src/webview/components/graph/runtime/physicsLifecycle/updates', () => ({
  shouldApplyPhysicsUpdate: physicsHarness.shouldApplyPhysicsUpdate,
}));

vi.mock('../../../../../../../src/webview/components/graph/runtime/physicsLifecycle/readiness', () => ({
  selectActivePhysicsGraph: physicsHarness.selectActivePhysicsGraph,
}));

import { usePhysicsRuntimeUpdates } from '../../../../../../../src/webview/components/graph/runtime/use/physics/hook/updates';

const SETTINGS: IPhysicsSettings = {
  centerForce: 0.1,
  damping: 0.7,
  linkDistance: 120,
  linkForce: 0.4,
  repelForce: 500,
};

describe('webview/graph/runtime/use/physics/updates', () => {
  beforeEach(() => {
    physicsHarness.applyPhysicsSettings.mockReset();
    physicsHarness.havePhysicsSettingsChanged.mockReset();
    physicsHarness.selectActivePhysicsGraph.mockReset();
    physicsHarness.shouldApplyPhysicsUpdate.mockReset();
  });

  it('applies updated settings when the active graph is ready', () => {
    const graph = {} as never;
    physicsHarness.selectActivePhysicsGraph.mockReturnValue(graph);
    physicsHarness.shouldApplyPhysicsUpdate.mockReturnValue(true);

    renderHook(() => usePhysicsRuntimeUpdates({
      fg2dRef: { current: graph },
      fg3dRef: { current: undefined },
      graphMode: '2d',
      physicsInitialisedRef: { current: true },
      physicsSettings: SETTINGS,
      previousPhysicsRef: { current: null },
    }));

    expect(physicsHarness.shouldApplyPhysicsUpdate).toHaveBeenCalledWith({
      graph,
      physicsInitialised: true,
      physicsSettings: SETTINGS,
      previousPhysics: null,
    });
    expect(physicsHarness.applyPhysicsSettings).toHaveBeenCalledWith(graph, SETTINGS);
  });

  it('skips updates when the active graph is missing or unchanged', () => {
    physicsHarness.selectActivePhysicsGraph.mockReturnValue(undefined);
    physicsHarness.shouldApplyPhysicsUpdate.mockReturnValue(true);

    renderHook(() => usePhysicsRuntimeUpdates({
      fg2dRef: { current: undefined },
      fg3dRef: { current: undefined },
      graphMode: '2d',
      physicsInitialisedRef: { current: false },
      physicsSettings: SETTINGS,
      previousPhysicsRef: { current: null },
    }));

    expect(physicsHarness.applyPhysicsSettings).not.toHaveBeenCalled();
  });

  it('updates when physics settings change after initialization', () => {
    const graph = {} as never;
    const nextSettings: IPhysicsSettings = {
      ...SETTINGS,
      repelForce: 600,
    };

    physicsHarness.selectActivePhysicsGraph.mockReturnValue(graph);
    physicsHarness.shouldApplyPhysicsUpdate.mockReturnValue(true);

    const previousPhysicsRef = { current: null as IPhysicsSettings | null };

    const { rerender } = renderHook(
      ({ physicsSettings }: { physicsSettings: IPhysicsSettings }) => usePhysicsRuntimeUpdates({
        fg2dRef: { current: graph },
        fg3dRef: { current: undefined },
        graphMode: '2d',
        physicsInitialisedRef: { current: true },
        physicsSettings,
        previousPhysicsRef,
      }),
      { initialProps: { physicsSettings: SETTINGS } },
    );

    rerender({ physicsSettings: nextSettings });

    expect(physicsHarness.applyPhysicsSettings).toHaveBeenCalledWith(graph, nextSettings);
    expect(previousPhysicsRef.current).toEqual(nextSettings);
  });
});
