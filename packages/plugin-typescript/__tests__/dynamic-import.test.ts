import { describe, it, expect, beforeEach } from 'vitest';
import { detect } from '../src/sources/dynamic-import';
import { PathResolver } from '../src/PathResolver';
import type { TsRuleContext } from '../src/types';

describe('dynamic-import rule', () => {
  let context: TsRuleContext;
  const testFile = '/workspace/src/test.ts';

  beforeEach(() => {
    context = { resolver: new PathResolver('/workspace') };
  });

  it('should detect dynamic import expression', () => {
    const connections = detect(`const mod = import('./lazy');`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./lazy');
    expect(connections[0].kind).toBe('import');
    expect(connections[0].type).toBe('dynamic');
    expect(connections[0].sourceId).toBe('dynamic-import');
  });

  it('should detect dynamic import in async function', () => {
    const connections = detect(`async function load() { const module = await import('./module'); }`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./module');
  });

  it('should detect dynamic import with then', () => {
    const connections = detect(`import('./module').then(module => module.default);`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./module');
  });

  it('should detect multiple dynamic imports', () => {
    const connections = detect(`const alpha = import('./a');\nconst beta = import('./b');`, testFile, context);
    expect(connections).toHaveLength(2);
  });

  it('should return empty for files with no dynamic imports', () => {
    const connections = detect(`const x = 42;`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should not detect static imports', () => {
    const connections = detect(`import { foo } from './bar';`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should not detect require calls', () => {
    const connections = detect(`const foo = require('./bar');`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should ignore dynamic import with non-string argument', () => {
    const connections = detect(`const name = './mod'; import(name);`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should detect dynamic import of npm package', () => {
    const connections = detect(`const React = import('react');`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].resolvedPath).toBeNull();
  });
});
