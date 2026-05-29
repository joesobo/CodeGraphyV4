import { describe, expect, it, vi } from 'vitest';
import { postPhysicsStabilized } from '../../../../../../src/webview/components/graph/runtime/use/interaction/engineStop';

describe('graph/runtime/use/interaction engine stop', () => {
  it('sends the physics stabilized message when the graph engine stops', () => {
    const sendMessage = vi.fn();

    postPhysicsStabilized(sendMessage);

    expect(sendMessage).toHaveBeenCalledWith({ type: 'PHYSICS_STABILIZED' });
  });
});
