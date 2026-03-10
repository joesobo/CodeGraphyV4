/**
 * @fileoverview Disposable pattern for resource cleanup.
 * @module @codegraphy/plugin-api/disposable
 */

/**
 * A handle to a resource that can be released.
 *
 * Many registration methods (e.g. `registerView`, `decorateNode`, `on`)
 * return a `Disposable`. Call {@link dispose} to unregister or release
 * the associated resource.
 *
 * @example
 * ```typescript
 * const sub = api.on('nodeClick', (payload) => { ... });
 * // Later, when no longer needed:
 * sub.dispose();
 * ```
 */
export interface Disposable {
  /** Release the resource held by this handle. */
  dispose(): void;
}
