import { describe, expect, it } from 'vitest';
import {
  fixtureBatchSourcePaths,
  fixtureImportSpecifier,
  fixtureSourcePath,
} from './paths';

describe('performance fixture paths', () => {
  it('maps file indexes into deterministic five-file groups', () => {
    expect([
      fixtureSourcePath(0),
      fixtureSourcePath(4),
      fixtureSourcePath(5),
    ]).toEqual([
      'src/group-00000/file-000000.ts',
      'src/group-00000/file-000004.ts',
      'src/group-00001/file-000005.ts',
    ]);
  });

  it('selects the highest numbered files for a batch change', () => {
    const paths = fixtureBatchSourcePaths(1_000, 100);

    expect(paths).toHaveLength(100);
    expect(paths[0]).toBe('src/group-00180/file-000900.ts');
    expect(paths.at(-1)).toBe('src/group-00199/file-000999.ts');
  });

  it('renders a relative extensionless import specifier', () => {
    expect(fixtureImportSpecifier(999, 900)).toBe('../group-00180/file-000900');
  });
});
