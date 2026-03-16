import { describe, it, expect, vi } from 'vitest';
import { DisposableMap } from '../../../src/core/plugins/DisposableMap';
import { toDisposable } from '../../../src/core/plugins/Disposable';

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

  it('disposes previous value when setting the same key', () => {
    const map = new DisposableMap<string>();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    map.set('a', toDisposable(fn1));
    map.set('a', toDisposable(fn2));

    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).not.toHaveBeenCalled();

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

  it('delete returns false for a missing key', () => {
    const map = new DisposableMap<string>();
    expect(map.delete('missing')).toBe(false);
  });

  it('has returns true for a set key and false for an unset key', () => {
    const map = new DisposableMap<string>();
    const disposable = toDisposable(() => {});
    map.set('a', disposable);

    expect(map.has('a')).toBe(true);
    expect(map.has('b')).toBe(false);

    map.dispose();
  });

  it('get returns the disposable for a set key', () => {
    const map = new DisposableMap<string>();
    const disposable = toDisposable(() => {});
    map.set('a', disposable);

    expect(map.get('a')).toBe(disposable);

    map.dispose();
  });

  it('get returns undefined for an unset key', () => {
    const map = new DisposableMap<string>();
    expect(map.get('missing')).toBeUndefined();
  });

  it('tracks size correctly across set and delete', () => {
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

  it('is idempotent — multiple dispose calls are safe', () => {
    const fn = vi.fn();
    const map = new DisposableMap<string>();
    map.set('a', toDisposable(fn));

    map.dispose();
    map.dispose();

    expect(fn).toHaveBeenCalledOnce();
  });
});
