import { describe, it, expect, vi } from 'vitest';
import {
  toDisposable,
  DisposableStore,
  DisposableMap,
} from '../../../src/core/plugins/Disposable';

describe('toDisposable', () => {
  it('calls the cleanup function on dispose', () => {
    const fn = vi.fn();
    const d = toDisposable(fn);
    d.dispose();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('only calls the cleanup function once', () => {
    const fn = vi.fn();
    const d = toDisposable(fn);
    d.dispose();
    d.dispose();
    d.dispose();
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('DisposableStore', () => {
  it('disposes all items on dispose()', () => {
    const store = new DisposableStore();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    store.add(toDisposable(fn1));
    store.add(toDisposable(fn2));

    store.dispose();

    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it('disposes in reverse order (LIFO)', () => {
    const order: number[] = [];
    const store = new DisposableStore();
    store.add(toDisposable(() => order.push(1)));
    store.add(toDisposable(() => order.push(2)));
    store.add(toDisposable(() => order.push(3)));

    store.dispose();

    expect(order).toEqual([3, 2, 1]);
  });

  it('returns the added disposable for chaining', () => {
    const store = new DisposableStore();
    const d = toDisposable(() => {});
    const result = store.add(d);
    expect(result).toBe(d);
    store.dispose();
  });

  it('tracks size correctly', () => {
    const store = new DisposableStore();
    expect(store.size).toBe(0);
    store.add(toDisposable(() => {}));
    expect(store.size).toBe(1);
    store.add(toDisposable(() => {}));
    expect(store.size).toBe(2);
    store.dispose();
    expect(store.size).toBe(0);
  });

  it('isDisposed returns correct state', () => {
    const store = new DisposableStore();
    expect(store.isDisposed).toBe(false);
    store.dispose();
    expect(store.isDisposed).toBe(true);
  });

  it('throws on add after dispose and disposes the item', () => {
    const store = new DisposableStore();
    store.dispose();

    const fn = vi.fn();
    expect(() => store.add(toDisposable(fn))).toThrow('already been disposed');
    expect(fn).toHaveBeenCalledOnce(); // item is immediately disposed
  });

  it('is idempotent (multiple dispose calls are safe)', () => {
    const fn = vi.fn();
    const store = new DisposableStore();
    store.add(toDisposable(fn));

    store.dispose();
    store.dispose();

    expect(fn).toHaveBeenCalledOnce();
  });

  it('continues disposing remaining items even if one throws', () => {
    const store = new DisposableStore();
    const fn1 = vi.fn();
    const fn3 = vi.fn();
    store.add(toDisposable(fn1));
    store.add(toDisposable(() => { throw new Error('boom'); }));
    store.add(toDisposable(fn3));

    // Should not throw
    store.dispose();

    expect(fn1).toHaveBeenCalledOnce();
    expect(fn3).toHaveBeenCalledOnce();
  });
});

describe('DisposableMap', () => {
  it('disposes all values on dispose()', () => {
    const map = new DisposableMap<string>();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    map.set('a', toDisposable(fn1));
    map.set('b', toDisposable(fn2));

    map.dispose();

    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it('disposes previous value when setting same key', () => {
    const map = new DisposableMap<string>();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    map.set('a', toDisposable(fn1));
    map.set('a', toDisposable(fn2));

    expect(fn1).toHaveBeenCalledOnce(); // old one disposed
    expect(fn2).not.toHaveBeenCalled(); // new one still alive

    map.dispose();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it('delete removes and disposes the entry', () => {
    const map = new DisposableMap<string>();
    const fn = vi.fn();
    map.set('a', toDisposable(fn));

    const result = map.delete('a');

    expect(result).toBe(true);
    expect(fn).toHaveBeenCalledOnce();
    expect(map.has('a')).toBe(false);
  });

  it('delete returns false for missing key', () => {
    const map = new DisposableMap<string>();
    expect(map.delete('missing')).toBe(false);
  });

  it('has and get work correctly', () => {
    const map = new DisposableMap<string>();
    const d = toDisposable(() => {});
    map.set('a', d);

    expect(map.has('a')).toBe(true);
    expect(map.get('a')).toBe(d);
    expect(map.has('b')).toBe(false);
    expect(map.get('b')).toBeUndefined();

    map.dispose();
  });

  it('tracks size correctly', () => {
    const map = new DisposableMap<string>();
    expect(map.size).toBe(0);
    map.set('a', toDisposable(() => {}));
    expect(map.size).toBe(1);
    map.set('b', toDisposable(() => {}));
    expect(map.size).toBe(2);
    map.delete('a');
    expect(map.size).toBe(1);
    map.dispose();
    expect(map.size).toBe(0);
  });

  it('immediately disposes items added after dispose', () => {
    const map = new DisposableMap<string>();
    map.dispose();

    const fn = vi.fn();
    map.set('a', toDisposable(fn));
    expect(fn).toHaveBeenCalledOnce();
  });
});
