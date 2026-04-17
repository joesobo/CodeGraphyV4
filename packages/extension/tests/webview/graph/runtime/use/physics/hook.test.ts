import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  syncPhysicsAnimation,
  usePhysicsRuntime,
} from '../../../../../../src/webview/components/graph/runtime/use/physics/hook';

const {
  usePhysicsRuntimeInit,
  usePhysicsRuntimeLayoutKey,
  usePhysicsRuntimeLayoutReset,
  usePhysicsRuntimePause,
  usePhysicsRuntimeUpdates,
} = vi.hoisted(() => ({
  usePhysicsRuntimeInit: vi.fn(),
  usePhysicsRuntimeLayoutKey: vi.fn(),
  usePhysicsRuntimeLayoutReset: vi.fn(),
  usePhysicsRuntimePause: vi.fn(),
  usePhysicsRuntimeUpdates: vi.fn(),
}));

vi.mock('../../../../../../src/webview/components/graph/runtime/use/physics/hook/init', () => ({
  usePhysicsRuntimeInit,
}));

vi.mock('../../../../../../src/webview/components/graph/runtime/use/physics/hook/layout', () => ({
  usePhysicsRuntimeLayoutKey,
  usePhysicsRuntimeLayoutReset,
}));

vi.mock('../../../../../../src/webview/components/graph/runtime/use/physics/hook/pause', () => ({
  usePhysicsRuntimePause,
}));

vi.mock('../../../../../../src/webview/components/graph/runtime/use/physics/hook/updates', () => ({
  usePhysicsRuntimeUpdates,
}));

describe('webview/graph/runtime/use/physics/hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeds the physics hook helpers with default paused state and 2d init flags', () => {
    const fg2dRef = { current: undefined };
    const fg3dRef = { current: undefined };
    const physicsSettings = { charge: -120 } as never;

    renderHook(() => usePhysicsRuntime({
      fg2dRef: fg2dRef as never,
      fg3dRef: fg3dRef as never,
      graphMode: '2d',
      layoutKey: 'layout',
      physicsSettings,
    }));

    expect(usePhysicsRuntimePause).toHaveBeenCalledWith(expect.objectContaining({
      graphMode: '2d',
      physicsPaused: false,
    }));
    expect(usePhysicsRuntimeInit).toHaveBeenCalledWith(expect.objectContaining({
      graphMode: '2d',
      physicsPaused: false,
      pendingThreeDimensionalInitRef: expect.objectContaining({ current: false }),
      physicsSettingsRef: expect.objectContaining({ current: physicsSettings }),
    }));
  });

  it('seeds 3d init flags and forwards explicit pause state', () => {
    const fg2dRef = { current: undefined };
    const fg3dRef = { current: undefined };

    renderHook(() => usePhysicsRuntime({
      fg2dRef: fg2dRef as never,
      fg3dRef: fg3dRef as never,
      graphMode: '3d',
      layoutKey: 'layout',
      physicsPaused: true,
      physicsSettings: {} as never,
    }));

    expect(usePhysicsRuntimeUpdates).toHaveBeenCalledWith(expect.objectContaining({
      graphMode: '3d',
    }));
    expect(usePhysicsRuntimeLayoutReset).toHaveBeenCalledWith(expect.objectContaining({
      pendingThreeDimensionalInitRef: expect.objectContaining({ current: true }),
    }));
    expect(usePhysicsRuntimeLayoutKey).toHaveBeenCalledWith(expect.objectContaining({
      graphMode: '3d',
      physicsPaused: true,
    }));
  });

  it('pauses and reheats the graph animation', () => {
    const instance = {
      d3ReheatSimulation: vi.fn(),
      pauseAnimation: vi.fn(),
      resumeAnimation: vi.fn(),
    };

    syncPhysicsAnimation(instance, true);

    expect(instance.pauseAnimation).toHaveBeenCalledOnce();
    expect(instance.resumeAnimation).not.toHaveBeenCalled();
    expect(instance.d3ReheatSimulation).toHaveBeenCalledOnce();
  });

  it('resumes and reheats the graph animation', () => {
    const instance = {
      d3ReheatSimulation: vi.fn(),
      pauseAnimation: vi.fn(),
      resumeAnimation: vi.fn(),
    };

    syncPhysicsAnimation(instance, false);

    expect(instance.pauseAnimation).not.toHaveBeenCalled();
    expect(instance.resumeAnimation).toHaveBeenCalledOnce();
    expect(instance.d3ReheatSimulation).toHaveBeenCalledOnce();
  });

  it('reheats the graph animation even when pause controls are missing', () => {
    const instance = {
      d3ReheatSimulation: vi.fn(),
    };

    expect(() => syncPhysicsAnimation(instance, true)).not.toThrow();
    expect(() => syncPhysicsAnimation(instance, false)).not.toThrow();
    expect(instance.d3ReheatSimulation).toHaveBeenCalledTimes(2);
  });

  it('does not throw when the graph cannot reheat', () => {
    const instance = {
      pauseAnimation: vi.fn(),
      resumeAnimation: vi.fn(),
    };

    expect(() => syncPhysicsAnimation(instance, true)).not.toThrow();
    expect(() => syncPhysicsAnimation(instance, false)).not.toThrow();
    expect(instance.pauseAnimation).toHaveBeenCalledOnce();
    expect(instance.resumeAnimation).toHaveBeenCalledOnce();
  });
});
