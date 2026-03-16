import { describe, it, expect, vi } from 'vitest';
import { DisposableMap } from '../../../src/core/plugins/disposableMap';
import { toDisposable } from '../../../src/core/plugins/disposable';

describe('DisposableMap', () => {
  it('stores a disposable for a key', () => {
    const map = new DisposableMap<string>();
    const disposable = toDisposable(vi.fn());
    map.set('key', disposable);
    expect(map.has('key')).toBe(true);
  });

  it('returns the disposable for a key via get()', () => {
    const map = new DisposableMap<string>();
    const disposable = toDisposable(vi.fn());
    map.set('key', disposable);
    expect(map.get('key')).toBe(disposable);
  });

  it('returns undefined for a missing key', () => {
    const map = new DisposableMap<string>();
    expect(map.get('missing')).toBeUndefined();
  });

  it('disposes the previous value when a key is overwritten', () => {
    const map = new DisposableMap<string>();
    const oldFn = vi.fn();
    map.set('key', toDisposable(oldFn));
    map.set('key', toDisposable(vi.fn()));
    expect(oldFn).toHaveBeenCalledOnce();
  });

  it('removes a key via delete() and disposes it', () => {
    const map = new DisposableMap<string>();
    const fn = vi.fn();
    map.set('key', toDisposable(fn));
    const result = map.delete('key');
    expect(result).toBe(true);
    expect(map.has('key')).toBe(false);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('returns false from delete() when the key does not exist', () => {
    const map = new DisposableMap<string>();
    expect(map.delete('absent')).toBe(false);
  });

  it('reports correct size', () => {
    const map = new DisposableMap<string>();
    expect(map.size).toBe(0);
    map.set('a', toDisposable(vi.fn()));
    map.set('b', toDisposable(vi.fn()));
    expect(map.size).toBe(2);
  });

  it('disposes all entries on dispose()', () => {
    const map = new DisposableMap<string>();
    const fnA = vi.fn();
    const fnB = vi.fn();
    map.set('a', toDisposable(fnA));
    map.set('b', toDisposable(fnB));
    map.dispose();
    expect(fnA).toHaveBeenCalledOnce();
    expect(fnB).toHaveBeenCalledOnce();
  });

  it('does not dispose twice when dispose() is called repeatedly', () => {
    const map = new DisposableMap<string>();
    const fn = vi.fn();
    map.set('key', toDisposable(fn));
    map.dispose();
    map.dispose();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('immediately disposes a value set after disposal', () => {
    const map = new DisposableMap<string>();
    map.dispose();
    const fn = vi.fn();
    map.set('key', toDisposable(fn));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('continues disposing other entries when one throws during dispose', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const map = new DisposableMap<string>();
    const fn = vi.fn();
    map.set('a', toDisposable(() => { throw new Error('fail'); }));
    map.set('b', toDisposable(fn));

    map.dispose();

    expect(fn).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('clears the map after dispose', () => {
    const map = new DisposableMap<string>();
    map.set('a', toDisposable(vi.fn()));
    map.set('b', toDisposable(vi.fn()));

    map.dispose();

    expect(map.size).toBe(0);
  });

  it('does not store a value set after disposal', () => {
    const map = new DisposableMap<string>();
    map.dispose();
    map.set('key', toDisposable(vi.fn()));

    expect(map.has('key')).toBe(false);
    expect(map.size).toBe(0);
  });
});
