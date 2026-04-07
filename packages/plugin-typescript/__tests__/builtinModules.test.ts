import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadBuiltinModules() {
  const module = await import('../src/builtinModules');
  return module.BUILTIN_MODULES;
}

describe('BUILTIN_MODULES', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('contains the expected built-in module set', () => {
    return loadBuiltinModules().then((builtinModules) => {
      expect([...builtinModules]).toEqual([
        'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'util',
        'stream', 'events', 'buffer', 'child_process', 'cluster',
        'dns', 'net', 'readline', 'tls', 'dgram', 'assert', 'zlib',
        'querystring', 'string_decoder', 'timers', 'tty', 'v8', 'vm',
        'worker_threads', 'perf_hooks', 'async_hooks', 'inspector',
      ]);
    });
  });

  it('does not include common third-party package names', async () => {
    const builtinModules = await loadBuiltinModules();

    expect(builtinModules.has('react')).toBe(false);
    expect(builtinModules.has('lodash')).toBe(false);
    expect(builtinModules.has('@types/node')).toBe(false);
  });
});
