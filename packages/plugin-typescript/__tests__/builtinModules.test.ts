import { describe, expect, it } from 'vitest';
import { BUILTIN_MODULES } from '../src/builtinModules';

describe('BUILTIN_MODULES', () => {
  it('contains the expected built-in module set', () => {
    expect([...BUILTIN_MODULES]).toEqual([
      'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'util',
      'stream', 'events', 'buffer', 'child_process', 'cluster',
      'dns', 'net', 'readline', 'tls', 'dgram', 'assert', 'zlib',
      'querystring', 'string_decoder', 'timers', 'tty', 'v8', 'vm',
      'worker_threads', 'perf_hooks', 'async_hooks', 'inspector',
    ]);
  });

  it('does not include common third-party package names', () => {
    expect(BUILTIN_MODULES.has('react')).toBe(false);
    expect(BUILTIN_MODULES.has('lodash')).toBe(false);
    expect(BUILTIN_MODULES.has('@types/node')).toBe(false);
  });
});
