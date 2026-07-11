import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIdleGraphAnimationController } from '../../../../../src/webview/components/graph/viewport/animation/idle';

describe('graph viewport idle animation', () => {
  afterEach(() => vi.useRealTimers());

  it('pauses the render cycle after the force engine stops', () => {
    vi.useFakeTimers();
    const graph = { pauseAnimation: vi.fn(), resumeAnimation: vi.fn() };
    const controller = createIdleGraphAnimationController(() => graph);

    controller.engineStopped();
    expect(graph.pauseAnimation).not.toHaveBeenCalled();

    vi.runOnlyPendingTimers();
    expect(graph.pauseAnimation).toHaveBeenCalledOnce();
  });

  it('resumes for activity and pauses after the interaction grace period', () => {
    vi.useFakeTimers();
    const graph = { pauseAnimation: vi.fn(), resumeAnimation: vi.fn() };
    const controller = createIdleGraphAnimationController(() => graph);

    controller.activity();
    expect(graph.resumeAnimation).toHaveBeenCalledOnce();
    expect(graph.pauseAnimation).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(graph.pauseAnimation).toHaveBeenCalledOnce();
  });

  it('keeps rendering while the force engine continues ticking', () => {
    vi.useFakeTimers();
    const graph = { pauseAnimation: vi.fn(), resumeAnimation: vi.fn() };
    const controller = createIdleGraphAnimationController(() => graph);

    controller.activity();
    controller.engineTick();
    vi.runOnlyPendingTimers();

    expect(graph.pauseAnimation).not.toHaveBeenCalled();
  });

  it('renders non-simulating graph changes before returning to idle', () => {
    vi.useFakeTimers();
    const graph = { pauseAnimation: vi.fn(), resumeAnimation: vi.fn() };
    const controller = createIdleGraphAnimationController(() => graph);

    controller.graphChanged(false);
    expect(graph.resumeAnimation).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(50);
    expect(graph.pauseAnimation).toHaveBeenCalledOnce();
  });
});
