/**
 * @fileoverview Disposable utilities for managing cleanup of resources.
 * Provides composable disposal patterns used throughout the plugin system.
 * @module core/plugins/Disposable
 */

/**
 * Interface for objects that hold resources requiring explicit cleanup.
 */
export interface Disposable {
  dispose(): void;
}

/**
 * Wraps a cleanup function as a Disposable.
 * Ensures the cleanup function is only called once.
 */
export function toDisposable(fn: () => void): Disposable {
  let disposed = false;
  return {
    dispose() {
      if (!disposed) {
        disposed = true;
        fn();
      }
    },
  };
}

/**
 * Manages a collection of disposables, disposing them all at once.
 * Disposables are disposed in reverse order of addition (LIFO).
 */
export class DisposableStore implements Disposable {
  private readonly _disposables: Disposable[] = [];
  private _isDisposed = false;

  /**
   * Whether this store has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Adds a disposable to the store. Returns the same disposable for chaining.
   * @throws Error if the store has already been disposed
   */
  add<T extends Disposable>(disposable: T): T {
    if (this._isDisposed) {
      disposable.dispose();
      throw new Error('DisposableStore has already been disposed');
    }
    this._disposables.push(disposable);
    return disposable;
  }

  /**
   * Disposes all contained disposables in reverse order and clears the store.
   */
  dispose(): void {
    if (this._isDisposed) return;
    this._isDisposed = true;

    const errors: unknown[] = [];
    // Dispose in reverse order (LIFO)
    for (let i = this._disposables.length - 1; i >= 0; i--) {
      try {
        this._disposables[i].dispose();
      } catch (e) {
        errors.push(e);
      }
    }
    this._disposables.length = 0;

    if (errors.length > 0) {
      console.error('[CodeGraphy] Errors during DisposableStore disposal:', errors);
    }
  }

  /**
   * Number of disposables currently in the store.
   */
  get size(): number {
    return this._disposables.length;
  }

  /**
   * Symbol.dispose support for using-declarations.
   */
  [Symbol.dispose](): void {
    this.dispose();
  }
}

export { DisposableMap } from './disposableMap';
