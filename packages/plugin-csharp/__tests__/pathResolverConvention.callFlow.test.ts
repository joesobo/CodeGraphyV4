import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tryResolveNamespaceParts: vi.fn(),
}));

vi.mock('../src/pathResolverConventionParts', () => ({
  tryResolveNamespaceParts: mocks.tryResolveNamespaceParts,
}));

import { conventionBasedResolve } from '../src/pathResolverConvention';
import type { ResolverFsOps } from '../src/pathResolverFs';

describe('conventionBasedResolve call flow', () => {
  const fsOps: ResolverFsOps = {
    fileExists: () => false,
    directoryExists: () => false,
    findCsFileInDir: () => null,
  };

  beforeEach(() => {
    mocks.tryResolveNamespaceParts.mockReset();
  });

  it('auto-detects namespace candidates when root namespace is undefined', () => {
    mocks.tryResolveNamespaceParts.mockReturnValue(null);

    const resolved = conventionBasedResolve({
      namespace: 'Company.Product.Service',
      sourceDirs: ['src'],
      fsOps,
    });

    expect(resolved).toBeNull();
    expect(mocks.tryResolveNamespaceParts).toHaveBeenCalledTimes(3);
    expect(mocks.tryResolveNamespaceParts).toHaveBeenNthCalledWith(
      1,
      ['Company', 'Product', 'Service'],
      ['src'],
      fsOps,
    );
    expect(mocks.tryResolveNamespaceParts).toHaveBeenNthCalledWith(2, ['Product', 'Service'], ['src'], fsOps);
    expect(mocks.tryResolveNamespaceParts).toHaveBeenNthCalledWith(3, ['Service'], ['src'], fsOps);
  });

  it('returns explicit-root resolution immediately without trying auto-detect candidates', () => {
    mocks.tryResolveNamespaceParts.mockImplementation((parts: readonly string[]) => {
      if (parts.join('/') === 'Services/ApiService') {
        return 'src/Services/ApiService.cs';
      }
      return 'src/auto-candidate.cs';
    });

    const resolved = conventionBasedResolve({
      namespace: 'MyApp.Core.Services.ApiService',
      rootNamespace: 'MyApp.Core',
      sourceDirs: ['src'],
      fsOps,
    });

    expect(resolved).toBe('src/Services/ApiService.cs');
    expect(mocks.tryResolveNamespaceParts).toHaveBeenCalledTimes(1);
    expect(mocks.tryResolveNamespaceParts).toHaveBeenCalledWith(
      ['Services', 'ApiService'],
      ['src'],
      fsOps,
    );
  });

  it('falls back to auto-detection when explicit root namespace does not match', () => {
    mocks.tryResolveNamespaceParts.mockImplementation((parts: readonly string[]) => {
      if (parts.join('/') === 'Services/ApiService') {
        return 'src/Services/ApiService.cs';
      }
      return null;
    });

    const resolved = conventionBasedResolve({
      namespace: 'Company.Product.Services.ApiService',
      rootNamespace: 'MyApp.Core',
      sourceDirs: ['src'],
      fsOps,
    });

    expect(resolved).toBe('src/Services/ApiService.cs');
    expect(mocks.tryResolveNamespaceParts).toHaveBeenCalledTimes(3);
    expect(mocks.tryResolveNamespaceParts).toHaveBeenNthCalledWith(
      1,
      ['Company', 'Product', 'Services', 'ApiService'],
      ['src'],
      fsOps,
    );
    expect(mocks.tryResolveNamespaceParts).toHaveBeenNthCalledWith(
      2,
      ['Product', 'Services', 'ApiService'],
      ['src'],
      fsOps,
    );
    expect(mocks.tryResolveNamespaceParts).toHaveBeenNthCalledWith(
      3,
      ['Services', 'ApiService'],
      ['src'],
      fsOps,
    );
  });

  it('does not short-circuit to explicit resolution for partially matching root namespaces', () => {
    mocks.tryResolveNamespaceParts.mockImplementation((parts: readonly string[]) => {
      if (parts.join('/') === 'Services/ApiService') {
        return 'src/Services/ApiService.cs';
      }
      return null;
    });

    const resolved = conventionBasedResolve({
      namespace: 'MyApp.CoreX.Services.ApiService',
      rootNamespace: 'MyApp.Core',
      sourceDirs: ['src'],
      fsOps,
    });

    expect(resolved).toBe('src/Services/ApiService.cs');
    expect(mocks.tryResolveNamespaceParts).toHaveBeenCalledTimes(3);
    expect(mocks.tryResolveNamespaceParts).toHaveBeenNthCalledWith(
      1,
      ['MyApp', 'CoreX', 'Services', 'ApiService'],
      ['src'],
      fsOps,
    );
  });
});
