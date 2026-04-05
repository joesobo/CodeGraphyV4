import { describe, it, expect, beforeEach } from 'vitest';
import { detect } from '../src/sources/es6-import';
import { PathResolver } from '../src/PathResolver';
import type { TsRuleContext } from '../src/types';

describe('es6-import rule', () => {
  let context: TsRuleContext;
  const testFile = '/workspace/src/test.ts';

  beforeEach(() => {
    context = { resolver: new PathResolver('/workspace') };
  });

  it('should detect default import', () => {
    const connections = detect(`import foo from './bar';`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./bar');
    expect(connections[0].kind).toBe('import');
    expect(connections[0].type).toBe('static');
    expect(connections[0].sourceId).toBe('es6-import');
  });

  it('should detect named import', () => {
    const connections = detect(`import { foo } from './bar';`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./bar');
  });

  it('should detect namespace import', () => {
    const connections = detect(`import * as utils from './utils';`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./utils');
  });

  it('should detect side-effect import', () => {
    const connections = detect(`import './styles.css';`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./styles.css');
  });

  it('should detect multiple imports', () => {
    const connections = detect(`import { alpha } from './a';\nimport { beta } from './b';`, testFile, context);
    expect(connections).toHaveLength(2);
    expect(connections[0].specifier).toBe('./a');
    expect(connections[1].specifier).toBe('./b');
  });

  it('should return empty for files with no imports', () => {
    const connections = detect(`const x = 42;\nconsole.log(x);`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should detect import from npm package', () => {
    const connections = detect(`import React from 'react';`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('react');
    expect(connections[0].resolvedPath).toBeNull();
  });

  it('should handle tsx file extensions', () => {
    const connections = detect(`import { Button } from './Button';`, '/workspace/src/App.tsx', context);
    expect(connections).toHaveLength(1);
  });

  it('should handle js file extensions', () => {
    const connections = detect(`import { helper } from './helper';`, '/workspace/src/app.js', context);
    expect(connections).toHaveLength(1);
  });

  it('should handle jsx file extensions', () => {
    const connections = detect(`import { Component } from './Component';`, '/workspace/src/App.jsx', context);
    expect(connections).toHaveLength(1);
  });

  it('should not detect require calls', () => {
    const connections = detect(`const foo = require('./bar');`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should not detect dynamic imports', () => {
    const connections = detect(`const mod = import('./lazy');`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should not detect export declarations', () => {
    const connections = detect(`export { foo } from './bar';`, testFile, context);
    expect(connections).toHaveLength(0);
  });
});
