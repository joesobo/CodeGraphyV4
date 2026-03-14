import { describe, it, expect } from 'vitest';
import { conventionBasedResolve } from '../src/pathResolverConvention';
import type { ResolverFsOps } from '../src/pathResolverFs';

describe('conventionBasedResolve', () => {
  function createFsOps(files: string[]): ResolverFsOps {
    const normalizedFiles = new Set(files.map(value => value.replace(/\\/g, '/')));

    return {
      fileExists: (relativePath: string) => normalizedFiles.has(relativePath.replace(/\\/g, '/')),
      directoryExists: () => false,
      findCsFileInDir: () => null,
    };
  }

  it('uses explicit root namespace when namespace starts with that root', () => {
    const resolved = conventionBasedResolve({
      namespace: 'MyApp.Features.Accounts.UserService',
      rootNamespace: 'MyApp',
      sourceDirs: ['src'],
      fsOps: createFsOps(['src/Features/Accounts/UserService.cs']),
    });

    expect(resolved).toBe('src/Features/Accounts/UserService.cs');
  });

  it('falls back to auto-detected root stripping when explicit root does not match', () => {
    const resolved = conventionBasedResolve({
      namespace: 'Company.Product.Services.ApiService',
      rootNamespace: 'MyApp',
      sourceDirs: ['src'],
      fsOps: createFsOps(['src/Services/ApiService.cs']),
    });

    expect(resolved).toBe('src/Services/ApiService.cs');
  });

  it('returns null when no convention-based match exists', () => {
    const resolved = conventionBasedResolve({
      namespace: 'MyApp.Services.MissingType',
      rootNamespace: 'MyApp',
      sourceDirs: ['src'],
      fsOps: createFsOps([]),
    });

    expect(resolved).toBeNull();
  });
});
