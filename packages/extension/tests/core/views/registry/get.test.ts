import { describe, expect, it } from 'vitest';
import { createRegistry, createMockContext, createMockView } from './testUtils';

describe('ViewRegistry get and availability', () => {
  it('returns view info by ID', () => {
    const registry = createRegistry();
    const view = createMockView();

    registry.register(view, { core: true });

    const info = registry.get(view.id);

    expect(info).toBeDefined();
    expect(info?.view).toBe(view);
    expect(info?.core).toBe(true);
  });

  it('returns undefined for non-existent view', () => {
    const registry = createRegistry();

    expect(registry.get('non.existent')).toBeUndefined();
  });

  it('returns true for available core view', () => {
    const registry = createRegistry();
    const view = createMockView();

    registry.register(view, { core: true });

    expect(registry.isViewAvailable(view.id, createMockContext())).toBe(true);
  });

  it('returns false for non-existent view in isViewAvailable', () => {
    const registry = createRegistry();

    expect(registry.isViewAvailable('non.existent', createMockContext())).toBe(false);
  });

  it('returns false when plugin is not active', () => {
    const registry = createRegistry();
    const view = createMockView({ pluginId: 'required-plugin' });

    registry.register(view);

    expect(registry.isViewAvailable(view.id, createMockContext({ activePlugins: new Set() }))).toBe(false);
  });

  it('returns true when plugin is active', () => {
    const registry = createRegistry();
    const view = createMockView({ pluginId: 'required-plugin' });

    registry.register(view);

    expect(registry.isViewAvailable(
      view.id,
      createMockContext({ activePlugins: new Set(['required-plugin']) })
    )).toBe(true);
  });

  it('respects isAvailable method', () => {
    const registry = createRegistry();
    const view = createMockView({
      isAvailable: (ctx) => ctx.focusedFile !== undefined,
    });

    registry.register(view, { core: true });

    expect(registry.isViewAvailable(view.id, createMockContext())).toBe(false);
    expect(registry.isViewAvailable(view.id, createMockContext({ focusedFile: 'src/app.ts' }))).toBe(true);
  });

  it('returns all views when no constraints are present', () => {
    const registry = createRegistry();
    const view1 = createMockView({ id: 'first' });
    const view2 = createMockView({ id: 'second' });

    registry.register(view1, { core: true });
    registry.register(view2, { core: true });

    expect(registry.getAvailableViews(createMockContext())).toHaveLength(2);
  });

  it('filters views by plugin availability', () => {
    const registry = createRegistry();
    const coreView = createMockView({ id: 'core' });
    const pluginView = createMockView({ id: 'plugin', pluginId: 'typescript-plugin' });

    registry.register(coreView, { core: true });
    registry.register(pluginView);

    expect(registry.getAvailableViews(createMockContext({ activePlugins: new Set() }))).toHaveLength(1);
    expect(registry.getAvailableViews(
      createMockContext({ activePlugins: new Set(['typescript-plugin']) })
    )).toHaveLength(2);
  });

  it('filters views by isAvailable', () => {
    const registry = createRegistry();
    const alwaysView = createMockView({ id: 'always' });
    const conditionalView = createMockView({
      id: 'conditional',
      isAvailable: (ctx) => ctx.focusedFile !== undefined,
    });

    registry.register(alwaysView, { core: true });
    registry.register(conditionalView, { core: true });

    expect(registry.getAvailableViews(createMockContext())).toHaveLength(1);
    expect(registry.getAvailableViews(createMockContext({ focusedFile: 'src/app.ts' }))).toHaveLength(2);
  });

  it('sorts core views before plugin views', () => {
    const registry = createRegistry();
    const pluginView = createMockView({ id: 'plugin', pluginId: 'test' });
    const coreView = createMockView({ id: 'core' });

    registry.register(pluginView);
    registry.register(coreView, { core: true });

    const views = registry.getAvailableViews(createMockContext({ activePlugins: new Set(['test']) }));

    expect(views[0].view.id).toBe('core');
    expect(views[1].view.id).toBe('plugin');
  });
});
