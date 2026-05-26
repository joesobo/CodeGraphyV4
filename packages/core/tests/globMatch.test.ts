import { describe, expect, it } from 'vitest';
import { globMatch, globToRegex } from '../src/globMatch';

describe('globMatch', () => {
  it('supports basename, single-star, and recursive glob matching', () => {
    expect(globMatch('packages/core/src/index.ts', '*.ts')).toBe(true);
    expect(globMatch('packages/core/src/index.ts', 'src/*.ts')).toBe(true);
    expect(globMatch('packages/core/src/deep/index.ts', 'src/*.ts')).toBe(false);
    expect(globMatch('packages/core/src/deep/index.ts', 'src/**/*.ts')).toBe(true);
  });

  it('escapes regular-expression syntax in literal glob segments', () => {
    expect(globToRegex('src/[special].ts').test('src/[special].ts')).toBe(true);
    expect(globToRegex('src/[special].ts').test('src/special.ts')).toBe(false);
  });
});
