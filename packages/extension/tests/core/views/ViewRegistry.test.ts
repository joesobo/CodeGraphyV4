import { describe, it, expect, beforeEach } from 'vitest';
import { ViewRegistry, IView, IViewContext } from '../../../src/core/views';
import { IGraphData } from '../../../src/shared/types';

// Helper to create a mock view
function createMockView(overrides: Partial<IView> = {}): IView {
  return {
    id: 'test.view',
    name: 'Test View',
    icon: 'symbol-file',
    description: 'A test view',
    transform: (data: IGraphData) => data,
    ...overrides,
  };
}

// Helper to create a basic view context
function createMockContext(overrides: Partial<IViewContext> = {}): IViewContext {
  return {
    activePlugins: new Set(),
    ...overrides,
  };
}

describe('ViewRegistry', () => {
  let registry: ViewRegistry;

  beforeEach(() => {
    registry = new ViewRegistry();
  });

  describe('register', () => {
    it('should register a view', () => {
      const view = createMockView();
      registry.register(view);

      expect(registry.size).toBe(1);
      expect(registry.get(view.id)).toBeDefined();
    });

    it('should register view as core when specified', () => {
      const view = createMockView();
      registry.register(view, { core: true });

      const info = registry.get(view.id);
      expect(info?.core).toBe(true);
    });

    it('should set first registered view as default', () => {
      const view = createMockView();
      registry.register(view);

      expect(registry.getDefaultViewId()).toBe(view.id);
    });

    it('should respect isDefault option', () => {
      const view1 = createMockView({ id: 'first' });
      const view2 = createMockView({ id: 'second' });
      registry.register(view1);
      registry.register(view2, { isDefault: true });

      expect(registry.getDefaultViewId()).toBe('second');
    });

    it('should throw if view ID already exists', () => {
      const view = createMockView();
      registry.register(view);

      expect(() => registry.register(view)).toThrow(
        "View with ID 'test.view' is already registered"
      );
    });
  });

  describe('unregister', () => {
    it('should unregister a view', () => {
      const view = createMockView();
      registry.register(view);

      const result = registry.unregister(view.id);

      expect(result).toBe(true);
      expect(registry.size).toBe(0);
      expect(registry.get(view.id)).toBeUndefined();
    });

    it('should return false for non-existent view', () => {
      const result = registry.unregister('non.existent');
      expect(result).toBe(false);
    });

    it('should update default view when unregistering current default', () => {
      const view1 = createMockView({ id: 'first' });
      const view2 = createMockView({ id: 'second' });
      registry.register(view1);
      registry.register(view2);

      registry.unregister('first');

      expect(registry.getDefaultViewId()).toBe('second');
    });
  });

  describe('get', () => {
    it('should return view info by ID', () => {
      const view = createMockView();
      registry.register(view, { core: true });

      const info = registry.get(view.id);

      expect(info).toBeDefined();
      expect(info?.view).toBe(view);
      expect(info?.core).toBe(true);
    });

    it('should return undefined for non-existent view', () => {
      const info = registry.get('non.existent');
      expect(info).toBeUndefined();
    });
  });

  describe('setDefaultViewId', () => {
    it('should set the default view', () => {
      const view1 = createMockView({ id: 'first' });
      const view2 = createMockView({ id: 'second' });
      registry.register(view1);
      registry.register(view2);

      registry.setDefaultViewId('second');

      expect(registry.getDefaultViewId()).toBe('second');
    });

    it('should throw for non-existent view', () => {
      expect(() => registry.setDefaultViewId('non.existent')).toThrow(
        "View with ID 'non.existent' is not registered"
      );
    });
  });

  describe('getAvailableViews', () => {
    it('should return all views when no constraints', () => {
      const view1 = createMockView({ id: 'first' });
      const view2 = createMockView({ id: 'second' });
      registry.register(view1, { core: true });
      registry.register(view2, { core: true });

      const context = createMockContext();
      const views = registry.getAvailableViews(context);

      expect(views).toHaveLength(2);
    });

    it('should filter views by plugin availability', () => {
      const coreView = createMockView({ id: 'core' });
      const pluginView = createMockView({ id: 'plugin', pluginId: 'typescript-plugin' });
      registry.register(coreView, { core: true });
      registry.register(pluginView);

      // Without the plugin
      const contextWithout = createMockContext({ activePlugins: new Set() });
      const viewsWithout = registry.getAvailableViews(contextWithout);
      expect(viewsWithout).toHaveLength(1);
      expect(viewsWithout[0].view.id).toBe('core');

      // With the plugin
      const contextWith = createMockContext({ activePlugins: new Set(['typescript-plugin']) });
      const viewsWith = registry.getAvailableViews(contextWith);
      expect(viewsWith).toHaveLength(2);
    });

    it('should filter views by isAvailable', () => {
      const alwaysView = createMockView({ id: 'always' });
      const conditionalView = createMockView({
        id: 'conditional',
        isAvailable: (ctx) => ctx.focusedFile !== undefined,
      });
      registry.register(alwaysView, { core: true });
      registry.register(conditionalView, { core: true });

      // Without focused file
      const contextWithout = createMockContext();
      const viewsWithout = registry.getAvailableViews(contextWithout);
      expect(viewsWithout).toHaveLength(1);

      // With focused file
      const contextWith = createMockContext({ focusedFile: 'src/app.ts' });
      const viewsWith = registry.getAvailableViews(contextWith);
      expect(viewsWith).toHaveLength(2);
    });

    it('should sort core views before plugin views', () => {
      const pluginView = createMockView({ id: 'plugin', pluginId: 'test' });
      const coreView = createMockView({ id: 'core' });
      registry.register(pluginView);
      registry.register(coreView, { core: true });

      const context = createMockContext({ activePlugins: new Set(['test']) });
      const views = registry.getAvailableViews(context);

      expect(views[0].view.id).toBe('core');
      expect(views[1].view.id).toBe('plugin');
    });
  });

  describe('list', () => {
    it('should return all registered views', () => {
      const view1 = createMockView({ id: 'first' });
      const view2 = createMockView({ id: 'second' });
      registry.register(view1);
      registry.register(view2);

      const views = registry.list();

      expect(views).toHaveLength(2);
      expect(views.map(v => v.view.id)).toContain('first');
      expect(views.map(v => v.view.id)).toContain('second');
    });

    it('should return empty array when no views registered', () => {
      expect(registry.list()).toEqual([]);
    });
  });

  describe('isViewAvailable', () => {
    it('should return true for available core view', () => {
      const view = createMockView();
      registry.register(view, { core: true });

      const context = createMockContext();
      expect(registry.isViewAvailable(view.id, context)).toBe(true);
    });

    it('should return false for non-existent view', () => {
      const context = createMockContext();
      expect(registry.isViewAvailable('non.existent', context)).toBe(false);
    });

    it('should return false when plugin is not active', () => {
      const view = createMockView({ pluginId: 'required-plugin' });
      registry.register(view);

      const context = createMockContext({ activePlugins: new Set() });
      expect(registry.isViewAvailable(view.id, context)).toBe(false);
    });

    it('should return true when plugin is active', () => {
      const view = createMockView({ pluginId: 'required-plugin' });
      registry.register(view);

      const context = createMockContext({ activePlugins: new Set(['required-plugin']) });
      expect(registry.isViewAvailable(view.id, context)).toBe(true);
    });

    it('should respect isAvailable method', () => {
      const view = createMockView({
        isAvailable: (ctx) => ctx.selectedFolder !== undefined,
      });
      registry.register(view, { core: true });

      const contextWithout = createMockContext();
      expect(registry.isViewAvailable(view.id, contextWithout)).toBe(false);

      const contextWith = createMockContext({ selectedFolder: 'src' });
      expect(registry.isViewAvailable(view.id, contextWith)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all views', () => {
      const view1 = createMockView({ id: 'first' });
      const view2 = createMockView({ id: 'second' });
      registry.register(view1);
      registry.register(view2);

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.getDefaultViewId()).toBeUndefined();
    });
  });
});
