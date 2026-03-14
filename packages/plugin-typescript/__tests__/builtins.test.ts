import { describe, it, expect } from 'vitest';
import { isBuiltIn, isBareSpecifier } from '../src/builtins';

describe('isBuiltIn', () => {
  it('should recognize fs as built-in', () => {
    expect(isBuiltIn('fs')).toBe(true);
  });

  it('should recognize path as built-in', () => {
    expect(isBuiltIn('path')).toBe(true);
  });

  it('should recognize node: prefixed built-ins', () => {
    expect(isBuiltIn('node:fs')).toBe(true);
    expect(isBuiltIn('node:path')).toBe(true);
  });

  it('should recognize subpath of built-in', () => {
    expect(isBuiltIn('fs/promises')).toBe(true);
  });

  it('should not recognize npm packages as built-in', () => {
    expect(isBuiltIn('express')).toBe(false);
    expect(isBuiltIn('lodash')).toBe(false);
  });

  it('should not recognize relative paths as built-in', () => {
    expect(isBuiltIn('./utils')).toBe(false);
  });

  it('should recognize all standard Node.js built-ins', () => {
    const expectedBuiltins = [
      'os', 'crypto', 'http', 'https', 'url', 'util',
      'stream', 'events', 'buffer', 'child_process', 'cluster',
      'dns', 'net', 'readline', 'tls', 'dgram', 'assert', 'zlib',
      'querystring', 'string_decoder', 'timers', 'tty', 'v8', 'vm',
      'worker_threads', 'perf_hooks', 'async_hooks', 'inspector',
    ];
    for (const builtin of expectedBuiltins) {
      expect(isBuiltIn(builtin)).toBe(true);
    }
  });
});

describe('isBareSpecifier', () => {
  it('should return true for simple package names', () => {
    expect(isBareSpecifier('react')).toBe(true);
    expect(isBareSpecifier('lodash')).toBe(true);
  });

  it('should return true for scoped packages', () => {
    expect(isBareSpecifier('@types/node')).toBe(true);
    expect(isBareSpecifier('@mui/material')).toBe(true);
  });

  it('should return true for packages with subpaths', () => {
    expect(isBareSpecifier('lodash/merge')).toBe(true);
  });

  it('should return false for relative paths', () => {
    expect(isBareSpecifier('./utils')).toBe(false);
    expect(isBareSpecifier('../helpers')).toBe(false);
  });

  it('should return false for dot-only specifiers', () => {
    expect(isBareSpecifier('.')).toBe(false);
    expect(isBareSpecifier('..')).toBe(false);
  });

  it('should return false for absolute paths', () => {
    expect(isBareSpecifier('/absolute/path')).toBe(false);
  });

  it('should return false for root-relative paths', () => {
    expect(isBareSpecifier('/usr/local/lib')).toBe(false);
  });

  it('should return true for packages with hyphens', () => {
    expect(isBareSpecifier('my-package')).toBe(true);
    expect(isBareSpecifier('@my-scope/my-package')).toBe(true);
  });

  it('should return true for bare specifier with trailing slash', () => {
    // Distinguishes startsWith('/') mutation: 'react/'.endsWith('/') is true
    // which would incorrectly return false — the real check is startsWith('/')
    expect(isBareSpecifier('react/')).toBe(true);
  });

  it('should return false for hash-prefixed specifiers not matching bare package pattern', () => {
    // Distinguishes regex anchor ^ mutation: without ^ the regex matches any
    // substring, so '#/components' would match 'c' inside and return true incorrectly
    expect(isBareSpecifier('#/components')).toBe(false);
  });

  it('should return true for package name ending with a dot', () => {
    // Distinguishes endsWith('.') mutation: 'my-module.' ends with '.' so the
    // mutated condition fires and returns false instead of the correct true
    expect(isBareSpecifier('my-module.')).toBe(true);
  });
});
