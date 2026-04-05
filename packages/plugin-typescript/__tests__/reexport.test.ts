import { describe, it, expect, beforeEach } from 'vitest';
import { detect } from '../src/sources/reexport';
import { PathResolver } from '../src/PathResolver';
import type { TsRuleContext } from '../src/types';

describe('reexport rule', () => {
  let context: TsRuleContext;
  const testFile = '/workspace/src/test.ts';

  beforeEach(() => {
    context = { resolver: new PathResolver('/workspace') };
  });

  it('should detect named re-export', () => {
    const connections = detect(`export { foo } from './bar';`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./bar');
    expect(connections[0].kind).toBe('reexport');
    expect(connections[0].type).toBe('reexport');
    expect(connections[0].sourceId).toBe('reexport');
  });

  it('should detect star re-export', () => {
    const connections = detect(`export * from './utils';`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./utils');
  });

  it('should detect star re-export with alias', () => {
    const connections = detect(`export * as utils from './utils';`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./utils');
  });

  it('should detect multiple re-exports', () => {
    const connections = detect(`export { alpha } from './a';\nexport { beta } from './b';`, testFile, context);
    expect(connections).toHaveLength(2);
  });

  it('should return empty for files with no re-exports', () => {
    const connections = detect(`const x = 42;\nexport default x;`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should not detect static imports', () => {
    const connections = detect(`import { foo } from './bar';`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should not detect local exports', () => {
    const connections = detect(`export const foo = 42;`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should detect re-export of npm package', () => {
    const connections = detect(`export { useState } from 'react';`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].resolvedPath).toBeNull();
  });

  it('should not detect export default declaration', () => {
    const connections = detect(`export default function myFunc() {}`, testFile, context);
    expect(connections).toHaveLength(0);
  });
});
