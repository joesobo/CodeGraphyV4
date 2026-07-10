import { describe, expect, it, vi } from 'vitest';
import { postPhysicsStabilized } from '../../../../../../src/webview/components/graph/runtime/use/interaction/engineStop';

describe('graph/runtime/use/interaction engine stop', () => {
  it('sends the physics stabilized message when the graph engine stops', () => {
    const sendMessage = vi.fn();

    postPhysicsStabilized(sendMessage);

    expect(sendMessage).toHaveBeenCalledWith({ type: 'PHYSICS_STABILIZED' });
  });

  it('publishes correlated performance settle events before the generic message', () => {
    const calls: string[] = [];
    const sendMessage = vi.fn(() => calls.push('generic'));
    const perfLifecycle = {
      engineStopped: vi.fn(() => {
        calls.push('correlated');
        return true;
      }),
    };

    postPhysicsStabilized(sendMessage, perfLifecycle);

    expect(calls).toEqual(['correlated', 'generic']);
  });

  it('notifies scripted scenarios of settle before the generic message', () => {
    const calls: string[] = [];
    const sendMessage = vi.fn(() => calls.push('generic'));
    const perfLifecycle = { engineStopped: vi.fn(() => false) };
    const perfControl = {
      engineStopped: vi.fn(() => calls.push('scenario')),
    };

    postPhysicsStabilized(sendMessage, perfLifecycle, perfControl);

    expect(calls).toEqual(['scenario', 'generic']);
  });

  it('marks render readiness before the generic diagnostic message', () => {
    const calls: string[] = [];
    const sendMessage = vi.fn(() => calls.push('generic'));
    const perfLifecycle = { engineStopped: vi.fn(() => false) };
    const perfControl = { engineStopped: vi.fn() };
    const renderReadyControl = {
      engineStopped: vi.fn(() => calls.push('render-ready')),
    };

    postPhysicsStabilized(
      sendMessage,
      perfLifecycle,
      perfControl,
      renderReadyControl,
    );

    expect(calls).toEqual(['render-ready', 'generic']);
  });
});
