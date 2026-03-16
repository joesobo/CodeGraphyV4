/**
 * @fileoverview DisposableMap — a keyed map of disposables.
 * @module core/plugins/disposableMap
 */

import type { Disposable } from './disposable';

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
