import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useParticleSettings } from '../../../../../src/webview/components/settingsPanel/display/use/particles';

const sentMessages: unknown[] = [];
vi.mock('../../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

describe('display useParticleSettings', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    vi.useRealTimers();
  });

  it('normalizes particle speed values before persisting them', () => {
    const setParticleSpeed = vi.fn();
    const { result } = renderHook(() =>
      useParticleSettings({
        setParticleSize: vi.fn(),
        setParticleSpeed,
      }),
    );

    act(() => {
      result.current.onParticleSpeedChange(2);
      result.current.onParticleSpeedCommit();
    });

    expect(setParticleSpeed).toHaveBeenCalledWith(0.001);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_PARTICLE_SETTING',
      payload: { key: 'particleSpeed', value: 0.001 },
    });
  });

  it('flushes the latest particle size value through the commit callback', () => {
    const setParticleSize = vi.fn();
    const { result } = renderHook(() =>
      useParticleSettings({
        setParticleSize,
        setParticleSpeed: vi.fn(),
      }),
    );

    act(() => {
      result.current.onParticleSizeChange(4.5);
      result.current.onParticleSizeCommit();
    });

    expect(setParticleSize).toHaveBeenCalledWith(4.5);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_PARTICLE_SETTING',
      payload: { key: 'particleSize', value: 4.5 },
    });
  });

  it('cancels pending particle posts on unmount', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() =>
      useParticleSettings({
        setParticleSize: vi.fn(),
        setParticleSpeed: vi.fn(),
      }),
    );

    act(() => {
      result.current.onParticleSizeChange(5);
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(sentMessages).toEqual([]);
  });
});
