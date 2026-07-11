import { describe, expect, it } from 'vitest';
import { resolvePhysicsInitAction } from '../../../../../src/webview/components/graph/runtime/physicsLifecycle/init/action';

describe('graph/runtime/physicsLifecycle/init', () => {
  it('skips initialization once physics is already initialized', () => {
    expect(resolvePhysicsInitAction({
      fg2d: {} as never,
      physicsInitialised: true,
    })).toEqual({ type: 'skip' });
  });

  it('waits while the 2d graph instance is unavailable', () => {
    expect(resolvePhysicsInitAction({
      fg2d: undefined,
      physicsInitialised: false,
    })).toEqual({ type: 'wait' });
  });

  it('initializes the 2d graph instance once it is available', () => {
    const graph = {} as never;

    expect(resolvePhysicsInitAction({
      fg2d: graph,
      physicsInitialised: false,
    })).toEqual({ instance: graph, type: 'init' });
  });
});
