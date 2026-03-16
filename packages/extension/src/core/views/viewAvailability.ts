/**
 * @fileoverview Pure functions for checking view availability.
 * Extracted from ViewRegistry to keep availability logic independently testable.
 * @module core/views/viewAvailability
 */

import { IViewInfo, IViewContext } from './types';

/**
 * Returns all views from the given map that are available in the provided context.
 *
 * A view is available when:
 * - It has no pluginId, OR its pluginId is in context.activePlugins
 * - It has no isAvailable method, OR isAvailable(context) returns true
 *
 * Results are sorted with core views first, then by registration order.
 */
export function getAvailableViews(
  views: Map<string, IViewInfo>,
  context: IViewContext,
): IViewInfo[] {
  const available: IViewInfo[] = [];

  for (const info of views.values()) {
    const view = info.view;

    // Check plugin availability
    if (view.pluginId && !context.activePlugins.has(view.pluginId)) {
      continue;
    }

    // Check custom availability
    if (view.isAvailable && !view.isAvailable(context)) {
      continue;
    }

    available.push(info);
  }

  // Sort by registration order (core views first)
  return available.sort((va, vb) => {
    // Core views come first
    if (va.core !== vb.core) {
      return va.core ? -1 : 1;
    }
    // Then by registration order
    return va.order - vb.order;
  });
}

/**
 * Returns whether the view with the given ID is available in the provided context.
 *
 * Returns false if the view is not found in the map.
 */
export function isViewAvailable(
  views: Map<string, IViewInfo>,
  viewId: string,
  context: IViewContext,
): boolean {
  const info = views.get(viewId);
  if (!info) return false;

  const view = info.view;

  // Check plugin availability
  if (view.pluginId && !context.activePlugins.has(view.pluginId)) {
    return false;
  }

  // Check custom availability
  if (view.isAvailable && !view.isAvailable(context)) {
    return false;
  }

  return true;
}
