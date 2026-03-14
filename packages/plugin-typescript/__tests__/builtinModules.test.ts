import { describe, it, expect } from 'vitest';
import { BUILTIN_MODULES } from '../src/builtinModules';

describe('BUILTIN_MODULES', () => {
  it('should contain fs', () => {
    expect(BUILTIN_MODULES.has('fs')).toBe(true);
  });

  it('should contain path', () => {
    expect(BUILTIN_MODULES.has('path')).toBe(true);
  });

  it('should contain all expected Node.js built-in modules', () => {
    const expected = [
      'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'util',
      'stream', 'events', 'buffer', 'child_process', 'cluster',
      'dns', 'net', 'readline', 'tls', 'dgram', 'assert', 'zlib',
      'querystring', 'string_decoder', 'timers', 'tty', 'v8', 'vm',
      'worker_threads', 'perf_hooks', 'async_hooks', 'inspector',
    ];
    for (const mod of expected) {
      expect(BUILTIN_MODULES.has(mod)).toBe(true);
    }
  });

  it('should not contain non-built-in modules', () => {
    expect(BUILTIN_MODULES.has('express')).toBe(false);
    expect(BUILTIN_MODULES.has('react')).toBe(false);
    expect(BUILTIN_MODULES.has('lodash')).toBe(false);
  });

  it('should be a Set', () => {
    expect(BUILTIN_MODULES).toBeInstanceOf(Set);
  });
});
