/**
 * @fileoverview Pure functions for computing view availability from a registry map.
 * @module core/views/viewAvailability
 */

import { IViewInfo, IViewContext } from './contracts';

/**
 * Gets all views that are available in the given context.
 * A view is available if:
 * - Its plugin is in the activePlugins set (or has no pluginId), AND
 * - Its isAvailable() method returns true (if defined)
 *
 * Results are sorted: core views first, then by registration order.
 *
 * @param views - Map of view ID to view info
 * @param context - The current view context
 * @returns Array of available view info objects, sorted by registration order
 */
export function getAvailableViews(views: Map<string, IViewInfo>, context: IViewContext): IViewInfo[] {
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
 * Checks if a specific view is available in the given context.
 *
 * @param views - Map of view ID to view info
 * @param viewId - ID of the view to check
 * @param context - The current view context
 * @returns true if the view is available
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
