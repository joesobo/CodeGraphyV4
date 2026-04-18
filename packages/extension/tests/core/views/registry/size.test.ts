import { describe, expect, it } from 'vitest';
import { createRegistry, createMockView } from './testUtils';

describe('ViewRegistry size', () => {
  it('returns 0 for empty registry', () => {
    const registry = createRegistry();

    expect(registry.size).toBe(0);
  });

  it('decreases after unregister', () => {
    const registry = createRegistry();
    const view = createMockView();

    registry.register(view);
    expect(registry.size).toBe(1);

    registry.unregister(view.id);
    expect(registry.size).toBe(0);
  });

  it('clears all views and resets default', () => {
    const registry = createRegistry();
    const view1 = createMockView({ id: 'first' });
    const view2 = createMockView({ id: 'second' });

    registry.register(view1);
    registry.register(view2);
    registry.clear();

    expect(registry.size).toBe(0);
    expect(registry.getDefaultViewId()).toBeUndefined();
  });

  it('resets order counter so next view starts at order 0', () => {
    const registry = createRegistry();
    const view1 = createMockView({ id: 'first' });

    registry.register(view1);
    registry.clear();

    const view2 = createMockView({ id: 'after-clear' });
    registry.register(view2);

    expect(registry.get('after-clear')!.order).toBe(0);
  });
});
