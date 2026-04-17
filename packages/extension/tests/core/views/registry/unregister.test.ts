import { describe, expect, it } from 'vitest';
import { createRegistry, createMockView } from './testUtils';

describe('ViewRegistry unregister', () => {
  it('unregisters a view', () => {
    const registry = createRegistry();
    const view = createMockView();

    registry.register(view);

    const result = registry.unregister(view.id);

    expect(result).toBe(true);
    expect(registry.size).toBe(0);
    expect(registry.get(view.id)).toBeUndefined();
  });

  it('returns false for non-existent view', () => {
    const registry = createRegistry();

    expect(registry.unregister('non.existent')).toBe(false);
  });

  it('updates default view when unregistering current default', () => {
    const registry = createRegistry();
    const view1 = createMockView({ id: 'first' });
    const view2 = createMockView({ id: 'second' });

    registry.register(view1);
    registry.register(view2);

    registry.unregister('first');

    expect(registry.getDefaultViewId()).toBe('second');
  });

  it('sets default to undefined when all views are removed', () => {
    const registry = createRegistry();
    const view = createMockView({ id: 'only' });

    registry.register(view);
    registry.unregister('only');

    expect(registry.getDefaultViewId()).toBeUndefined();
  });

  it('picks earliest registered view as new default when default is removed', () => {
    const registry = createRegistry();
    const view1 = createMockView({ id: 'first' });
    const view2 = createMockView({ id: 'second' });
    const view3 = createMockView({ id: 'third' });

    registry.register(view1);
    registry.register(view2);
    registry.register(view3);

    registry.unregister('first');

    expect(registry.getDefaultViewId()).toBe('second');
  });

  it('does not change default when removing a non-default view', () => {
    const registry = createRegistry();
    const view1 = createMockView({ id: 'default-view' });
    const view2 = createMockView({ id: 'other-view' });

    registry.register(view1);
    registry.register(view2);

    registry.unregister('other-view');

    expect(registry.getDefaultViewId()).toBe('default-view');
  });

  it('does not reselect default when removing non-default view', () => {
    const registry = createRegistry();
    const viewA = createMockView({ id: 'a' });
    const viewB = createMockView({ id: 'b' });
    const viewC = createMockView({ id: 'c' });

    registry.register(viewA);
    registry.register(viewB);
    registry.register(viewC);

    registry.unregister('c');

    expect(registry.getDefaultViewId()).toBe('a');
  });

  it('preserves manually set default when removing a different view', () => {
    const registry = createRegistry();
    const viewA = createMockView({ id: 'a' });
    const viewB = createMockView({ id: 'b' });
    const viewC = createMockView({ id: 'c' });

    registry.register(viewA);
    registry.register(viewB);
    registry.register(viewC);

    registry.setDefaultViewId('c');
    registry.unregister('b');

    expect(registry.getDefaultViewId()).toBe('c');
  });

  it('chooses the lowest-order remaining view as default after removing default', () => {
    const registry = createRegistry();
    const viewA = createMockView({ id: 'a' });
    const viewB = createMockView({ id: 'b' });
    const viewC = createMockView({ id: 'c' });
    const viewD = createMockView({ id: 'd' });

    registry.register(viewA);
    registry.register(viewB);
    registry.register(viewC);
    registry.register(viewD);

    registry.unregister('a');

    expect(registry.getDefaultViewId()).toBe('b');
  });

  it('reselects the next lowest-order default after repeated removals', () => {
    const registry = createRegistry();
    const viewA = createMockView({ id: 'a' });
    const viewB = createMockView({ id: 'b' });
    const viewC = createMockView({ id: 'c' });
    const viewD = createMockView({ id: 'd' });
    const viewE = createMockView({ id: 'e' });

    registry.register(viewA);
    registry.register(viewB);
    registry.register(viewC);
    registry.register(viewD);
    registry.register(viewE);

    registry.unregister('a');
    expect(registry.getDefaultViewId()).toBe('b');

    registry.unregister('b');
    expect(registry.getDefaultViewId()).toBe('c');

    registry.unregister('c');
    expect(registry.getDefaultViewId()).toBe('d');
  });
});
