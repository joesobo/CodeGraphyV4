import { describe, expect, it } from 'vitest';
import { createRegistry, createMockView } from './testUtils';

describe('ViewRegistry list', () => {
  it('returns all registered views', () => {
    const registry = createRegistry();
    const view1 = createMockView({ id: 'first' });
    const view2 = createMockView({ id: 'second' });

    registry.register(view1);
    registry.register(view2);

    const views = registry.list();

    expect(views).toHaveLength(2);
    expect(views.map((entry) => entry.view.id)).toContain('first');
    expect(views.map((entry) => entry.view.id)).toContain('second');
  });

  it('returns empty array when no views are registered', () => {
    const registry = createRegistry();

    expect(registry.list()).toEqual([]);
  });

  it('returns views in registration order', () => {
    const registry = createRegistry();
    const view1 = createMockView({ id: 'first' });
    const view2 = createMockView({ id: 'second' });
    const view3 = createMockView({ id: 'third' });

    registry.register(view1);
    registry.register(view2);
    registry.register(view3);

    const views = registry.list();

    expect(views[0].view.id).toBe('first');
    expect(views[1].view.id).toBe('second');
    expect(views[2].view.id).toBe('third');
  });

  it('preserves insertion order across registrations', () => {
    const registry = createRegistry();
    const view1 = createMockView({ id: 'alpha' });
    const view2 = createMockView({ id: 'beta' });
    const view3 = createMockView({ id: 'gamma' });
    const view4 = createMockView({ id: 'delta' });

    registry.register(view1);
    registry.register(view2);
    registry.register(view3);
    registry.register(view4);

    const views = registry.list();
    const ids = views.map((entry) => entry.view.id);

    expect(ids).toEqual(['alpha', 'beta', 'gamma', 'delta']);
    for (let i = 1; i < views.length; i += 1) {
      expect(views[i].order).toBeGreaterThan(views[i - 1].order);
    }
  });
});
