import { describe, expect, it } from 'vitest';
import {
  isPhysicsGraphReady,
} from '../../../../../src/webview/components/graph/runtime/physicsLifecycle/readiness';

describe('graph/runtime/physicsLifecycle/readiness', () => {
  it('treats a missing graph as not ready', () => {
    expect(isPhysicsGraphReady(undefined)).toBe(false);
  });

  it('treats a 2d graph instance as ready', () => {
    expect(isPhysicsGraphReady({} as never)).toBe(true);
  });
});
