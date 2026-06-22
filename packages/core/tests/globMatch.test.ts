import { describe, expect, it } from 'vitest';
import { createGlobMatcher, globMatch, globToRegex } from '../src/globMatch';

describe('globMatch', () => {
  it('supports basename, single-star, and recursive glob matching', () => {
    expect(globMatch('packages/core/src/index.ts', '*.ts')).toBe(true);
    expect(globMatch('packages/core/src/index.ts', 'src/*.ts')).toBe(true);
    expect(globMatch('packages/core/src/deep/index.ts', 'src/*.ts')).toBe(false);
    expect(globMatch('packages/core/src/index.ts', 'src/**/*.ts')).toBe(true);
    expect(globMatch('packages/core/src/deep/index.ts', 'src/**/*.ts')).toBe(true);
    expect(globMatch('packages/core/src/deep/index.ts', 'src/**')).toBe(true);
    expect(globMatch('index.ts', '**/*.ts')).toBe(true);
    expect(globMatch('src/index.ts', 'src/**/index.ts')).toBe(true);
    expect(globMatch('packages/core/src/index.js', '*.ts')).toBe(false);
    expect(globMatch('packages/core/xsrc/index.ts', 'src/*.ts')).toBe(false);
    expect(globMatch('src/app.ts', 'src/*/app.ts')).toBe(false);
  });

  it('escapes regular-expression syntax in literal glob segments', () => {
    expect(globToRegex('src/[special].ts').test('src/[special].ts')).toBe(true);
    expect(globToRegex('src/[special].ts').test('src/special.ts')).toBe(false);
    expect(globToRegex('src/app+(test).ts').test('src/app+(test).ts')).toBe(true);
    expect(globToRegex('src/app+(test).ts').test('src/appptestt.ts')).toBe(false);
  });

  it('creates reusable matchers with the same glob semantics', () => {
    const matcher = createGlobMatcher('src/**/*.ts');

    expect(matcher('src/index.ts')).toBe(true);
    expect(matcher('src/deep/index.ts')).toBe(true);
    expect(matcher('docs/index.ts')).toBe(false);
  });
});
