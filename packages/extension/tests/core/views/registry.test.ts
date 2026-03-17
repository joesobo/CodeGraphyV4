import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ViewRegistry } from '../../../src/core/views/registry';
import type { IView, IViewContext } from '../../../src/core/views/types';
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
      expect(views.map(entry => entry.view.id)).toContain('first');
      expect(views.map(entry => entry.view.id)).toContain('second');
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
        isAvailable: (ctx) => ctx.focusedFile !== undefined,
      });
      registry.register(view, { core: true });

      const contextWithout = createMockContext();
      expect(registry.isViewAvailable(view.id, contextWithout)).toBe(false);

      const contextWith = createMockContext({ focusedFile: 'src/app.ts' });
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

    it('should reset order counter so next view starts at order 0', () => {
      const view1 = createMockView({ id: 'first' });
      registry.register(view1);

      registry.clear();

      const view2 = createMockView({ id: 'after-clear' });
      registry.register(view2);

      expect(registry.get('after-clear')!.order).toBe(0);
    });
  });

  describe('register - additional edge cases', () => {
    it('should set core to false by default', () => {
      const view = createMockView();
      registry.register(view);

      expect(registry.get(view.id)!.core).toBe(false);
    });

    it('should not change default when registering non-default second view', () => {
      const view1 = createMockView({ id: 'first' });
      const view2 = createMockView({ id: 'second' });
      registry.register(view1);
      registry.register(view2);

      expect(registry.getDefaultViewId()).toBe('first');
    });

    it('should increment order for each registration', () => {
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
  });

  describe('unregister - additional edge cases', () => {
    it('should set default to undefined when all views are removed', () => {
      const view = createMockView({ id: 'only' });
      registry.register(view);
      registry.unregister('only');

      expect(registry.getDefaultViewId()).toBeUndefined();
    });

    it('should pick earliest-registered view as new default when default is removed', () => {
      const view1 = createMockView({ id: 'first' });
      const view2 = createMockView({ id: 'second' });
      const view3 = createMockView({ id: 'third' });
      registry.register(view1);
      registry.register(view2);
      registry.register(view3);

      // default is 'first', remove it
      registry.unregister('first');

      // Should pick 'second' (order=1) over 'third' (order=2)
      expect(registry.getDefaultViewId()).toBe('second');
    });

    it('should not change default when removing a non-default view', () => {
      const view1 = createMockView({ id: 'default-view' });
      const view2 = createMockView({ id: 'other-view' });
      registry.register(view1);
      registry.register(view2);

      registry.unregister('other-view');

      expect(registry.getDefaultViewId()).toBe('default-view');
    });
  });

  describe('list - ordering', () => {
    it('should return views in registration order', () => {
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

    it('should preserve insertion order across registrations', () => {
      const view1 = createMockView({ id: 'alpha' });
      const view2 = createMockView({ id: 'beta' });
      const view3 = createMockView({ id: 'gamma' });
      const view4 = createMockView({ id: 'delta' });

      registry.register(view1); // order 0
      registry.register(view2); // order 1
      registry.register(view3); // order 2
      registry.register(view4); // order 3

      const views = registry.list();
      const ids = views.map(entry => entry.view.id);

      expect(ids).toEqual(['alpha', 'beta', 'gamma', 'delta']);
      for (let i = 1; i < views.length; i++) {
        expect(views[i].order).toBeGreaterThan(views[i - 1].order);
      }
    });
  });

  describe('size', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.size).toBe(0);
    });

    it('should decrease after unregister', () => {
      const view = createMockView();
      registry.register(view);
      expect(registry.size).toBe(1);

      registry.unregister(view.id);
      expect(registry.size).toBe(0);
    });
  });

  describe('console logging', () => {
    it('should log on register with view name and id', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const view = createMockView({ id: 'my.view', name: 'My View' });

      registry.register(view);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[CodeGraphy] Registered view: My View (my.view)',
      );
      consoleSpy.mockRestore();
    });

    it('should log on successful unregister with view id', () => {
      const view = createMockView({ id: 'log.test' });
      registry.register(view);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      registry.unregister('log.test');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[CodeGraphy] Unregistered view: log.test',
      );
      consoleSpy.mockRestore();
    });

    it('should not log on unsuccessful unregister', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      registry.unregister('does.not.exist');

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('unregister - sort comparator for new default', () => {
    it('should pick the lowest-order remaining view as default after removing default', () => {
      // Register views with known order: a=0, b=1, c=2, d=3
      const viewA = createMockView({ id: 'a' });
      const viewB = createMockView({ id: 'b' });
      const viewC = createMockView({ id: 'c' });
      const viewD = createMockView({ id: 'd' });
      registry.register(viewA); // order 0, default
      registry.register(viewB); // order 1
      registry.register(viewC); // order 2
      registry.register(viewD); // order 3

      // Remove default (a, order=0). New default should be b (order=1), not d (order=3)
      registry.unregister('a');

      expect(registry.getDefaultViewId()).toBe('b');
    });

    it('should correctly sort remaining views by order when selecting new default', () => {
      // Register 5 views: a=0, b=1, c=2, d=3, e=4
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

      // Remove a (default). Remaining: b(1), c(2), d(3), e(4)
      registry.unregister('a');
      expect(registry.getDefaultViewId()).toBe('b');

      // Remove b (now default). Remaining: c(2), d(3), e(4)
      registry.unregister('b');
      expect(registry.getDefaultViewId()).toBe('c');

      // Remove c (now default). Remaining: d(3), e(4)
      registry.unregister('c');
      expect(registry.getDefaultViewId()).toBe('d');
    });

    it('should not reselect default when removing non-default view', () => {
      const viewA = createMockView({ id: 'a' });
      const viewB = createMockView({ id: 'b' });
      const viewC = createMockView({ id: 'c' });
      registry.register(viewA);
      registry.register(viewB);
      registry.register(viewC);

      // Remove c (not default). Default should remain 'a'
      registry.unregister('c');
      expect(registry.getDefaultViewId()).toBe('a');
    });

    it('should preserve manually-set default when removing a different view', () => {
      // This catches the mutant that replaces `this._defaultViewId === viewId` with `true`.
      // If the guard is always true, removing any view would reset the default to the
      // lowest-order view, overwriting the manually set default.
      const viewA = createMockView({ id: 'a' });
      const viewB = createMockView({ id: 'b' });
      const viewC = createMockView({ id: 'c' });
      registry.register(viewA); // order 0
      registry.register(viewB); // order 1
      registry.register(viewC); // order 2

      // Set default to 'c' (order 2) instead of 'a' (order 0)
      registry.setDefaultViewId('c');
      expect(registry.getDefaultViewId()).toBe('c');

      // Remove 'b' (not the default). Default should remain 'c'.
      // If guard is always true, it would sort remaining [a(0), c(2)] and pick 'a'.
      registry.unregister('b');
      expect(registry.getDefaultViewId()).toBe('c');
    });
  });
});
