import { describe, expect, it } from 'vitest';
import { deadEnds, deadSurfaces } from '../../src/boundaries/deadFiles';
import type { BoundaryFileNode } from '../../src/boundaries/types';

const files: BoundaryFileNode[] = [
  {
    absolutePath: '/repo/a.ts',
    entrypoint: false,
    incoming: 0,
    outgoing: 0,
    packageName: 'example',
    packageRelativePath: 'src/a.ts',
    relativePath: 'packages/example/src/a.ts'
  },
  {
    absolutePath: '/repo/b.ts',
    entrypoint: false,
    incoming: 0,
    outgoing: 1,
    packageName: 'example',
    packageRelativePath: 'src/b.ts',
    relativePath: 'packages/example/src/b.ts'
  },
  {
    absolutePath: '/repo/main.ts',
    entrypoint: true,
    incoming: 0,
    outgoing: 0,
    packageName: 'example',
    packageRelativePath: 'src/main.ts',
    relativePath: 'packages/example/src/main.ts'
  }
];

describe('deadEnds', () => {
  it('returns only non-entrypoint files without incoming or outgoing edges', () => {
    expect(deadEnds(files).map((file) => file.relativePath)).toEqual(['packages/example/src/a.ts']);
  });
});

describe('deadSurfaces', () => {
  it('returns only non-entrypoint files with outgoing but no incoming edges', () => {
    expect(deadSurfaces(files).map((file) => file.relativePath)).toEqual(['packages/example/src/b.ts']);
  });
});
