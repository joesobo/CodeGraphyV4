/**
 * @fileoverview Disposable pattern for resource cleanup.
 * @module @codegraphy-dev/plugin-api/disposable
 */

/**
 * A handle to a resource that can be released.
 *
 * Host-owned lifecycle helpers can return a `Disposable`. Call
 * {@link dispose} to unregister or release the associated resource.
 *
 * @example
 * ```typescript
 * const sub = subscribeToResource(() => { ... });
 * // Later, when no longer needed:
 * sub.dispose();
 * ```
 */
export interface Disposable {
  /** Release the resource held by this handle. */
  dispose(): void;
}
