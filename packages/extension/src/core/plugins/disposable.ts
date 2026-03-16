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

/**
 * A keyed map of disposables. Setting a new value for an existing key
 * automatically disposes the previous value.
 */
export class DisposableMap<K> implements Disposable {
  private readonly _map = new Map<K, Disposable>();
  private _isDisposed = false;

  /**
   * Sets a disposable for the given key.
   * If a disposable already exists for this key, it is disposed first.
   */
  set(key: K, disposable: Disposable): void {
    if (this._isDisposed) {
      disposable.dispose();
      return;
    }

    const existing = this._map.get(key);
    if (existing) {
      existing.dispose();
    }
    this._map.set(key, disposable);
  }

  /**
   * Gets the disposable for the given key, if any.
   */
  get(key: K): Disposable | undefined {
    return this._map.get(key);
  }

  /**
   * Removes and disposes the disposable for the given key.
   * @returns true if a disposable was found and disposed
   */
  delete(key: K): boolean {
    const disposable = this._map.get(key);
    if (disposable) {
      this._map.delete(key);
      disposable.dispose();
      return true;
    }
    return false;
  }

  /**
   * Whether a disposable exists for the given key.
   */
  has(key: K): boolean {
    return this._map.has(key);
  }

  /**
   * Disposes all contained disposables and clears the map.
   */
  dispose(): void {
    if (this._isDisposed) return;
    this._isDisposed = true;

    for (const disposable of this._map.values()) {
      try {
        disposable.dispose();
      } catch (e) {
        console.error('[CodeGraphy] Error during DisposableMap disposal:', e);
      }
    }
    this._map.clear();
  }

  /**
   * Number of entries in the map.
   */
  get size(): number {
    return this._map.size;
  }
}
