import { describe, expect, it } from 'vitest';
import { resolveImportTarget } from '../../src/boundaries/imports';

describe('resolveImportTarget', () => {
  it('ignores non-relative imports', () => {
    expect(resolveImportTarget('/repo/a.ts', 'vitest', new Set(['/repo/b.ts']))).toBeUndefined();
  });

  it('does not resolve non-relative specifiers against the current directory', () => {
    expect(resolveImportTarget('/repo/src/a.ts', 'b', new Set(['/repo/src/b']))).toBeUndefined();
  });

  it('ignores empty specifiers', () => {
    expect(resolveImportTarget('/repo/a.ts', '', new Set(['/repo/b.ts']))).toBeUndefined();
  });

  it('resolves sibling files with extensions', () => {
    expect(
      resolveImportTarget(
        '/repo/src/a.ts',
        './b',
        new Set(['/repo/src/b.ts'])
      )
    ).toBe('/repo/src/b.ts');
  });

  it('resolves index files inside a directory import', () => {
    expect(
      resolveImportTarget(
        '/repo/src/a.ts',
        './shared',
        new Set(['/repo/src/shared/index.tsx'])
      )
    ).toBe('/repo/src/shared/index.tsx');
  });

  it('returns undefined when no candidate matches', () => {
    expect(
      resolveImportTarget(
        '/repo/src/a.ts',
        './missing',
        new Set(['/repo/src/b.ts'])
      )
    ).toBeUndefined();
  });

  it('prefers the first matching candidate in resolution order', () => {
    expect(
      resolveImportTarget(
        '/repo/src/a.ts',
        './b',
        new Set(['/repo/src/b.ts', '/repo/src/b/index.ts'])
      )
    ).toBe('/repo/src/b.ts');
  });

  it.each([
    ['/repo/src/b', '/repo/src/b'],
    ['/repo/src/b.ts', '/repo/src/b.ts'],
    ['/repo/src/b.tsx', '/repo/src/b.tsx'],
    ['/repo/src/b.js', '/repo/src/b.js'],
    ['/repo/src/b.jsx', '/repo/src/b.jsx'],
    ['/repo/src/b/index.ts', '/repo/src/b/index.ts'],
    ['/repo/src/b/index.tsx', '/repo/src/b/index.tsx'],
    ['/repo/src/b/index.js', '/repo/src/b/index.js'],
    ['/repo/src/b/index.jsx', '/repo/src/b/index.jsx']
  ])('supports candidate path %s', (candidate, expected) => {
    expect(
      resolveImportTarget('/repo/src/a.ts', './b', new Set([candidate]))
    ).toBe(expected);
  });
});
