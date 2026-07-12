import { describe, expect, it } from 'vitest';
import { ownedLayout } from '../ownedPhysicsFixture';

describe('owned physics readiness', () => {
  it('treats a missing layout as not ready', () => {
    const layout = undefined;
    expect(layout).toBeUndefined();
  });

  it('treats an owned graph layout as ready immediately', () => {
    const layout = ownedLayout();
    expect(layout.engine).toBeDefined();
    expect(layout.engine.nodeIds).toEqual(['a']);
  });
});
