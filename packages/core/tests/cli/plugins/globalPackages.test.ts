import { describe, expect, it } from 'vitest';
import { resolveNpmGlobalPackageRoots } from '../../../src/cli/plugins/globalPackages';

describe('cli/plugins/globalPackages', () => {
  it('normalizes npm global root output into non-empty trimmed lines', () => {
    expect(resolveNpmGlobalPackageRoots(() => ({
      status: 0,
      stdout: Buffer.from(' /usr/local/lib/node_modules \n\n/opt/npm/lib\n'),
    }))).toEqual([
      '/usr/local/lib/node_modules',
      '/opt/npm/lib',
    ]);
  });

  it('returns no roots when npm root -g fails', () => {
    expect(resolveNpmGlobalPackageRoots(() => ({
      status: 1,
      stdout: '/usr/local/lib/node_modules',
    }))).toEqual([]);
  });
});
