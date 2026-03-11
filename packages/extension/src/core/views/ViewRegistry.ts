/**
 * @fileoverview View registry for managing CodeGraphy views.
 * Handles registration, lookup, and lifecycle of views.
 * @module core/views/ViewRegistry
 */

import { IView, IViewInfo, IViewContext } from './types';

/**
 * Registry for managing CodeGraphy views.
 * 
 * The registry maintains a collection of views and provides methods
 * to register, unregister, and query views. Views can be core (always
 * available) or plugin-provided (only available when plugin is active).
 * 
 * @example
 * ```typescript
 * const registry = new ViewRegistry();
 * 
 * // Register a core view
 * registry.register(connectionsView, { core: true });
 * 
 * // Register a plugin-provided view
 * registry.register(typeGraphView, { core: false });
 * 
 * // Get available views
 * const views = registry.getAvailableViews(context);
 * ```
 */
export class ViewRegistry {
  /** Map of view ID to view info */
  private readonly _views = new Map<string, IViewInfo>();
  
  /** Counter for tracking registration order */
  private _orderCounter = 0;
  
  /** Default view ID */
  private _defaultViewId: string | undefined;

  /**
   * Registers a view with the registry.
   * 
   * @param view - The view to register
   * @param options - Registration options
   * @throws Error if a view with the same ID is already registered
   */
  register(
    view: IView,
    options: { core?: boolean; isDefault?: boolean } = {}
  ): void {
    if (this._views.has(view.id)) {
      throw new Error(`View with ID '${view.id}' is already registered`);
    }

    const info: IViewInfo = {
      view,
      core: options.core ?? false,
      order: this._orderCounter++,
    };

    this._views.set(view.id, info);
    
    // Set as default if specified or if it's the first view
    if (options.isDefault || this._defaultViewId === undefined) {
      this._defaultViewId = view.id;
    }

    console.log(`[CodeGraphy] Registered view: ${view.name} (${view.id})`);
  }

  /**
   * Unregisters a view from the registry.
   * 
   * @param viewId - ID of the view to unregister
   * @returns true if the view was found and removed, false otherwise
   */
  unregister(viewId: string): boolean {
    const existed = this._views.delete(viewId);
    
    if (existed) {
      console.log(`[CodeGraphy] Unregistered view: ${viewId}`);
      
      // If we removed the default view, pick a new one
      if (this._defaultViewId === viewId) {
        const remaining = Array.from(this._views.values());
        this._defaultViewId = remaining.length > 0 
          ? remaining.sort((a, b) => a.order - b.order)[0].view.id 
          : undefined;
      }
    }
    
    return existed;
  }

  /**
   * Gets a view by its ID.
   * 
   * @param viewId - ID of the view to get
   * @returns The view info, or undefined if not found
   */
  get(viewId: string): IViewInfo | undefined {
    return this._views.get(viewId);
  }

  /**
   * Gets the default view ID.
   * 
   * @returns The default view ID, or undefined if no views are registered
   */
  getDefaultViewId(): string | undefined {
    return this._defaultViewId;
  }

  /**
   * Sets the default view ID.
   * 
   * @param viewId - ID of the view to set as default
   * @throws Error if the view is not registered
   */
  setDefaultViewId(viewId: string): void {
    if (!this._views.has(viewId)) {
      throw new Error(`View with ID '${viewId}' is not registered`);
    }
    this._defaultViewId = viewId;
  }

  /**
   * Gets all views that are available in the given context.
   * A view is available if:
   * - It's a core view, OR
   * - Its plugin is in the activePlugins set, AND
   * - Its isAvailable() method returns true (if defined)
   * 
   * @param context - The current view context
   * @returns Array of available view info objects, sorted by registration order
   */
  getAvailableViews(context: IViewContext): IViewInfo[] {
    const available: IViewInfo[] = [];
    
    for (const info of this._views.values()) {
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
    return available.sort((a, b) => {
      // Core views come first
      if (a.core !== b.core) {
        return a.core ? -1 : 1;
      }
      // Then by registration order
      return a.order - b.order;
    });
  }

  /**
   * Gets all registered views.
   * 
   * @returns Array of all view info objects
   */
  list(): IViewInfo[] {
    return Array.from(this._views.values()).sort((a, b) => a.order - b.order);
  }

  /**
   * Gets the count of registered views.
   */
  get size(): number {
    return this._views.size;
  }

  /**
   * Checks if a view is available in the given context.
   * 
   * @param viewId - ID of the view to check
   * @param context - The current view context
   * @returns true if the view is available
   */
  isViewAvailable(viewId: string, context: IViewContext): boolean {
    const info = this._views.get(viewId);
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

  /**
   * Clears all registered views.
   */
  clear(): void {
    this._views.clear();
    this._orderCounter = 0;
    this._defaultViewId = undefined;
  }
}
