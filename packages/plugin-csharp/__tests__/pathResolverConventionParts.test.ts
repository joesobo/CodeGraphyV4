import { describe, it, expect } from 'vitest';
import { tryResolveNamespaceParts } from '../src/pathResolverConventionParts';
import type { ResolverFsOps } from '../src/pathResolverFs';

describe('tryResolveNamespaceParts', () => {
  function createFsOps(options?: {
    files?: string[];
    dirs?: string[];
    discoveredByDir?: Record<string, string | null>;
  }): ResolverFsOps {
    const files = new Set((options?.files || []).map(value => value.replace(/\\/g, '/')));
    const dirs = new Set((options?.dirs || []).map(value => value.replace(/\\/g, '/')));
    const discoveredByDir = options?.discoveredByDir || {};

    return {
      fileExists: (relativePath: string) => files.has(relativePath.replace(/\\/g, '/')),
      directoryExists: (relativePath: string) => dirs.has(relativePath.replace(/\\/g, '/')),
      findCsFileInDir: (relativePath: string) => discoveredByDir[relativePath.replace(/\\/g, '/')] ?? null,
    };
  }

  it('returns null when namespace is empty', () => {
    const resolved = tryResolveNamespaceParts([], ['src'], createFsOps({
      dirs: ['src'],
      discoveredByDir: {
        src: 'src/Fallback.cs',
      },
      files: ['src/undefined.cs'],
    }));

    expect(resolved).toBeNull();
  });

  it('resolves direct file paths first', () => {
    const resolved = tryResolveNamespaceParts(
      ['MyApp', 'Services', 'UserService'],
      ['src'],
      createFsOps({ files: ['src/MyApp/Services/UserService.cs'] }),
    );

    expect(resolved).toBe('src/MyApp/Services/UserService.cs');
  });

  it('resolves from namespace directory discovery when explicit file is absent', () => {
    const resolved = tryResolveNamespaceParts(
      ['MyApp', 'Services'],
      ['src'],
      createFsOps({
        dirs: ['src/MyApp/Services'],
        discoveredByDir: {
          'src/MyApp/Services': 'src/MyApp/Services/ApiService.cs',
        },
      }),
    );

    expect(resolved).toBe('src/MyApp/Services/ApiService.cs');
  });

  it('falls back to simple file name inside each source directory', () => {
    const resolved = tryResolveNamespaceParts(
      ['MyApp', 'Services', 'OrderService'],
      ['src'],
      createFsOps({ files: ['src/OrderService.cs'] }),
    );

    expect(resolved).toBe('src/OrderService.cs');
  });

  it('falls back to simple file name when namespace discovery returns no file', () => {
    const resolved = tryResolveNamespaceParts(
      ['MyApp', 'Services'],
      ['src'],
      createFsOps({
        dirs: ['src/MyApp/Services'],
        discoveredByDir: {
          'src/MyApp/Services': null,
        },
        files: ['src/Services.cs'],
      }),
    );

    expect(resolved).toBe('src/Services.cs');
  });

  it('does not use namespace discovery when the namespace directory does not exist', () => {
    const fsOps = createFsOps({
      discoveredByDir: {
        'src/MyApp/Services': 'src/MyApp/Services/Unexpected.cs',
      },
    });

    const resolved = tryResolveNamespaceParts(
      ['MyApp', 'Services'],
      ['src'],
      fsOps,
    );

    expect(resolved).toBeNull();
  });

  it('supports namespace directory discovery without a source directory prefix', () => {
    const resolved = tryResolveNamespaceParts(
      ['MyApp', 'Services'],
      [''],
      createFsOps({
        dirs: ['MyApp/Services'],
        discoveredByDir: {
          'MyApp/Services': 'MyApp/Services/ApiService.cs',
        },
      }),
    );

    expect(resolved).toBe('MyApp/Services/ApiService.cs');
  });

  it('supports simple file fallback without a source directory prefix', () => {
    const resolved = tryResolveNamespaceParts(
      ['MyApp', 'Services', 'OrderService'],
      [''],
      createFsOps({ files: ['OrderService.cs'] }),
    );

    expect(resolved).toBe('OrderService.cs');
  });

  it('returns null when no resolution candidates exist', () => {
    const resolved = tryResolveNamespaceParts(
      ['MyApp', 'Services', 'MissingType'],
      ['src', 'app'],
      createFsOps(),
    );

    expect(resolved).toBeNull();
  });
});
