import { describe, it, expect } from 'vitest';
import { getAvailableViews, isViewAvailable } from '../../../src/core/views/viewAvailability';
import type { IView, IViewInfo, IViewContext } from '../../../src/core/views/types';
import { IGraphData } from '../../../src/shared/types';

function makeView(overrides: Partial<IView> = {}): IView {
  return {
    id: 'test.view',
    name: 'Test View',
    icon: 'symbol-file',
    description: 'A test view',
    transform: (data: IGraphData) => data,
    ...overrides,
  };
}

function makeInfo(view: IView, overrides: Partial<IViewInfo> = {}): IViewInfo {
  return {
    view,
    core: false,
    order: 0,
    ...overrides,
  };
}

function makeMap(...infos: IViewInfo[]): Map<string, IViewInfo> {
  const map = new Map<string, IViewInfo>();
  for (const info of infos) {
    map.set(info.view.id, info);
  }
  return map;
}

function makeContext(overrides: Partial<IViewContext> = {}): IViewContext {
  return {
    activePlugins: new Set(),
    ...overrides,
  };
}

describe('getAvailableViews', () => {
  it('returns an empty array when the views map is empty', () => {
    const result = getAvailableViews(new Map(), makeContext());
    expect(result).toHaveLength(0);
  });

  it('returns all views that have no plugin constraint', () => {
    const view1 = makeView({ id: 'a' });
    const view2 = makeView({ id: 'b' });
    const views = makeMap(makeInfo(view1), makeInfo(view2));

    const result = getAvailableViews(views, makeContext());

    expect(result).toHaveLength(2);
  });

  it('excludes a view whose required plugin is not active', () => {
    const pluginView = makeView({ id: 'plugin-view', pluginId: 'my-plugin' });
    const views = makeMap(makeInfo(pluginView));

    const result = getAvailableViews(views, makeContext({ activePlugins: new Set() }));

    expect(result).toHaveLength(0);
  });

  it('includes a view when its required plugin is active', () => {
    const pluginView = makeView({ id: 'plugin-view', pluginId: 'my-plugin' });
    const views = makeMap(makeInfo(pluginView));

    const result = getAvailableViews(views, makeContext({ activePlugins: new Set(['my-plugin']) }));

    expect(result).toHaveLength(1);
    expect(result[0].view.id).toBe('plugin-view');
  });

  it('excludes a view when isAvailable returns false', () => {
    const conditionalView = makeView({
      id: 'conditional',
      isAvailable: (ctx) => ctx.focusedFile !== undefined,
    });
    const views = makeMap(makeInfo(conditionalView));

    const result = getAvailableViews(views, makeContext({ focusedFile: undefined }));

    expect(result).toHaveLength(0);
  });

  it('includes a view when isAvailable returns true', () => {
    const conditionalView = makeView({
      id: 'conditional',
      isAvailable: (ctx) => ctx.focusedFile !== undefined,
    });
    const views = makeMap(makeInfo(conditionalView));

    const result = getAvailableViews(views, makeContext({ focusedFile: 'src/app.ts' }));

    expect(result).toHaveLength(1);
  });

  it('sorts core views before non-core views regardless of registration order', () => {
    const nonCoreView = makeView({ id: 'non-core' });
    const coreView = makeView({ id: 'core-view' });
    // Non-core registered first (order 0), core registered second (order 1)
    const views = makeMap(
      makeInfo(nonCoreView, { core: false, order: 0 }),
      makeInfo(coreView, { core: true, order: 1 }),
    );

    const result = getAvailableViews(views, makeContext());

    expect(result[0].view.id).toBe('core-view');
    expect(result[1].view.id).toBe('non-core');
  });

  it('sorts views with the same core status by registration order', () => {
    const view1 = makeView({ id: 'first' });
    const view2 = makeView({ id: 'second' });
    const view3 = makeView({ id: 'third' });
    const views = makeMap(
      makeInfo(view1, { core: true, order: 0 }),
      makeInfo(view2, { core: true, order: 1 }),
      makeInfo(view3, { core: true, order: 2 }),
    );

    const result = getAvailableViews(views, makeContext());

    expect(result.map(r => r.view.id)).toEqual(['first', 'second', 'third']);
  });
});

describe('isViewAvailable', () => {
  it('returns false when the view is not in the map', () => {
    const views = new Map<string, IViewInfo>();
    expect(isViewAvailable(views, 'missing-view', makeContext())).toBe(false);
  });

  it('returns true for a plain view with no constraints', () => {
    const view = makeView({ id: 'plain' });
    const views = makeMap(makeInfo(view));
    expect(isViewAvailable(views, 'plain', makeContext())).toBe(true);
  });

  it('returns false when the required plugin is not active', () => {
    const view = makeView({ id: 'plugin-view', pluginId: 'required-plugin' });
    const views = makeMap(makeInfo(view));
    expect(isViewAvailable(views, 'plugin-view', makeContext({ activePlugins: new Set() }))).toBe(false);
  });

  it('returns true when the required plugin is active', () => {
    const view = makeView({ id: 'plugin-view', pluginId: 'required-plugin' });
    const views = makeMap(makeInfo(view));
    expect(
      isViewAvailable(views, 'plugin-view', makeContext({ activePlugins: new Set(['required-plugin']) }))
    ).toBe(true);
  });

  it('returns false when isAvailable returns false', () => {
    const view = makeView({
      id: 'conditional',
      isAvailable: (ctx) => ctx.focusedFile !== undefined,
    });
    const views = makeMap(makeInfo(view));
    expect(isViewAvailable(views, 'conditional', makeContext({ focusedFile: undefined }))).toBe(false);
  });

  it('returns true when isAvailable returns true', () => {
    const view = makeView({
      id: 'conditional',
      isAvailable: (ctx) => ctx.focusedFile !== undefined,
    });
    const views = makeMap(makeInfo(view));
    expect(
      isViewAvailable(views, 'conditional', makeContext({ focusedFile: 'src/app.ts' }))
    ).toBe(true);
  });
});
