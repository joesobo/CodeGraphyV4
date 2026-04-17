import { describe, expect, it } from 'vitest';
import { createRegistry, createMockView } from './testUtils';

describe('ViewRegistry register', () => {
  it('registers a view', () => {
    const registry = createRegistry();
    const view = createMockView();

    registry.register(view);

    expect(registry.size).toBe(1);
    expect(registry.get(view.id)).toBeDefined();
  });

  it('registers view as core when specified', () => {
    const registry = createRegistry();
    const view = createMockView();

    registry.register(view, { core: true });

    expect(registry.get(view.id)?.core).toBe(true);
  });

  it('sets first registered view as default', () => {
    const registry = createRegistry();
    const view = createMockView();

    registry.register(view);

    expect(registry.getDefaultViewId()).toBe(view.id);
  });

  it('respects isDefault option', () => {
    const registry = createRegistry();
    const view1 = createMockView({ id: 'first' });
    const view2 = createMockView({ id: 'second' });

    registry.register(view1);
    registry.register(view2, { isDefault: true });

    expect(registry.getDefaultViewId()).toBe('second');
  });

  it('throws if view ID already exists', () => {
    const registry = createRegistry();
    const view = createMockView();

    registry.register(view);

    expect(() => registry.register(view)).toThrow(
      "View with ID 'test.view' is already registered"
    );
  });

  it('sets core to false by default', () => {
    const registry = createRegistry();
    const view = createMockView();

    registry.register(view);

    expect(registry.get(view.id)!.core).toBe(false);
  });

  it('increments order for each registration', () => {
    const registry = createRegistry();
    const view1 = createMockView({ id: 'first' });
    const view2 = createMockView({ id: 'second' });
    const view3 = createMockView({ id: 'third' });

    registry.register(view1);
    registry.register(view2);
    registry.register(view3);

    expect(registry.get('first')!.order).toBe(0);
    expect(registry.get('second')!.order).toBe(1);
    expect(registry.get('third')!.order).toBe(2);
  });

  it('does not change default when registering non-default second view', () => {
    const registry = createRegistry();
    const view1 = createMockView({ id: 'first' });
    const view2 = createMockView({ id: 'second' });

    registry.register(view1);
    registry.register(view2);

    expect(registry.getDefaultViewId()).toBe('first');
  });
});
