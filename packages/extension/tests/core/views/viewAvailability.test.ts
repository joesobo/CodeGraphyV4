import { describe, it, expect } from 'vitest';
import { getAvailableViews, isViewAvailable } from '../../../src/core/views/viewAvailability';
import { IViewInfo, IViewContext, IView } from '../../../src/core/views/contracts';
import type { IGraphData } from '../../../src/shared/graph/contracts';

function makeView(id: string, overrides: Partial<IView> = {}): IView {
  return {
    id,
    name: id,
    icon: 'file',
    description: id,
    transform: (data: IGraphData) => data,
    ...overrides,
  };
}

function makeInfo(view: IView, core = true, order = 0): IViewInfo {
  return { view, core, order };
}

function makeMap(...infos: IViewInfo[]): Map<string, IViewInfo> {
  const map = new Map<string, IViewInfo>();
  for (const info of infos) {
    map.set(info.view.id, info);
  }
  return map;
}

function context(overrides: Partial<IViewContext> = {}): IViewContext {
  return { activePlugins: new Set(), ...overrides };
}

describe('getAvailableViews', () => {
  it('returns all core views when no plugin restriction applies', () => {
    const views = makeMap(makeInfo(makeView('v1')), makeInfo(makeView('v2')));
    const result = getAvailableViews(views, context());
    expect(result.map((r) => r.view.id)).toEqual(['v1', 'v2']);
  });

  it('excludes a plugin view whose plugin is not active', () => {
    const pluginView = makeView('plugin-view', { pluginId: 'my-plugin' });
    const views = makeMap(makeInfo(pluginView, false, 0));
    const result = getAvailableViews(views, context());
    expect(result).toHaveLength(0);
  });

  it('includes a plugin view whose plugin is active', () => {
    const pluginView = makeView('plugin-view', { pluginId: 'my-plugin' });
    const views = makeMap(makeInfo(pluginView, false, 0));
    const result = getAvailableViews(views, context({ activePlugins: new Set(['my-plugin']) }));
    expect(result).toHaveLength(1);
  });

  it('excludes a view whose isAvailable() returns false', () => {
    const restrictedView = makeView('restricted', { isAvailable: () => false });
    const views = makeMap(makeInfo(restrictedView));
    const result = getAvailableViews(views, context());
    expect(result).toHaveLength(0);
  });

  it('sorts core views before non-core views', () => {
    const coreView = makeInfo(makeView('core'), true, 1);
    const pluginView = makeInfo(makeView('plugin', { pluginId: 'p' }), false, 0);
    const views = makeMap(coreView, pluginView);
    const result = getAvailableViews(views, context({ activePlugins: new Set(['p']) }));
    expect(result[0].view.id).toBe('core');
    expect(result[1].view.id).toBe('plugin');
  });

  it('sorts by registration order within the same core status', () => {
    const first = makeInfo(makeView('first'), true, 0);
    const second = makeInfo(makeView('second'), true, 1);
    const views = makeMap(second, first); // inserted in reverse order
    const result = getAvailableViews(views, context());
    expect(result[0].view.id).toBe('first');
    expect(result[1].view.id).toBe('second');
  });

  it('returns an empty array when the map is empty', () => {
    expect(getAvailableViews(new Map(), context())).toHaveLength(0);
  });
});

describe('isViewAvailable', () => {
  it('returns false for an unknown view id', () => {
    const views = makeMap(makeInfo(makeView('v1')));
    expect(isViewAvailable(views, 'unknown', context())).toBe(false);
  });

  it('returns true for a core view with no restrictions', () => {
    const views = makeMap(makeInfo(makeView('v1')));
    expect(isViewAvailable(views, 'v1', context())).toBe(true);
  });

  it('returns false when the required plugin is not active', () => {
    const pluginView = makeView('pv', { pluginId: 'needs-plugin' });
    const views = makeMap(makeInfo(pluginView, false));
    expect(isViewAvailable(views, 'pv', context())).toBe(false);
  });

  it('returns true when the required plugin is active', () => {
    const pluginView = makeView('pv', { pluginId: 'needs-plugin' });
    const views = makeMap(makeInfo(pluginView, false));
    expect(isViewAvailable(views, 'pv', context({ activePlugins: new Set(['needs-plugin']) }))).toBe(true);
  });

  it('returns false when isAvailable() returns false', () => {
    const restricted = makeView('rv', { isAvailable: () => false });
    const views = makeMap(makeInfo(restricted));
    expect(isViewAvailable(views, 'rv', context())).toBe(false);
  });
});
