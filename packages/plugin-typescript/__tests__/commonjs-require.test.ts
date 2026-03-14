import { describe, it, expect, beforeEach } from 'vitest';
import { detect } from '../src/rules/commonjs-require';
import { PathResolver } from '../src/PathResolver';
import type { TsRuleContext } from '../src/types';

describe('commonjs-require rule', () => {
  let context: TsRuleContext;
  const testFile = '/workspace/src/test.ts';

  beforeEach(() => {
    context = { resolver: new PathResolver('/workspace') };
  });

  it('should detect require call', () => {
    const connections = detect(`const foo = require('./bar');`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./bar');
    expect(connections[0].type).toBe('require');
    expect(connections[0].ruleId).toBe('commonjs-require');
  });

  it('should detect require without assignment', () => {
    const connections = detect(`require('./setup');`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./setup');
  });

  it('should detect destructured require', () => {
    const connections = detect(`const { alpha, beta } = require('./utils');`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('./utils');
  });

  it('should detect multiple requires', () => {
    const connections = detect(`const alpha = require('./a');\nconst beta = require('./b');`, testFile, context);
    expect(connections).toHaveLength(2);
  });

  it('should return empty for files with no requires', () => {
    const connections = detect(`const x = 42;`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should not detect static imports', () => {
    const connections = detect(`import { foo } from './bar';`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should not detect dynamic imports', () => {
    const connections = detect(`const mod = import('./bar');`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should detect require of npm package', () => {
    const connections = detect(`const express = require('express');`, testFile, context);
    expect(connections).toHaveLength(1);
    expect(connections[0].resolvedPath).toBeNull();
  });

  it('should ignore require with no arguments', () => {
    const connections = detect(`const x = require();`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should ignore non-string require arguments', () => {
    const connections = detect(`const name = './mod'; const x = require(name);`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should not detect other function calls with string arguments', () => {
    const connections = detect(`const x = myRequire('./bar');`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should not detect method calls named require', () => {
    const connections = detect(`const x = obj.require('./bar');`, testFile, context);
    expect(connections).toHaveLength(0);
  });

  it('should handle .cjs file extensions', () => {
    const connections = detect(`const foo = require('./bar');`, '/workspace/src/test.cjs', context);
    expect(connections).toHaveLength(1);
  });
});
