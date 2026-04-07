import { describe, expect, it, vi } from 'vitest';
import { syncPhysicsAnimation } from '../../../../../../src/webview/components/graph/runtime/use/graph/physics';

describe('webview/graph/runtime/use/graph/physics', () => {
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
});
