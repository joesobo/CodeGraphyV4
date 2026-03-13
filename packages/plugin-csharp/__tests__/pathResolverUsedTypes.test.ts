import { describe, it, expect } from 'vitest';
import { resolveWithUsedTypes } from '../src/pathResolverUsedTypes';
import type { ResolverFsOps } from '../src/pathResolverFs';

describe('resolveWithUsedTypes', () => {
  function createFsOps(files: string[]): ResolverFsOps {
    const normalized = new Set(files.map(value => value.replace(/\\/g, '/')));

    return {
      fileExists: (relativePath: string) => normalized.has(relativePath.replace(/\\/g, '/')),
      directoryExists: () => false,
      findCsFileInDir: () => null,
    };
  }

  it('resolves used types across namespace stripping and source directories', () => {
    const resolved = resolveWithUsedTypes({
      namespace: 'MyApp.Services',
      usedTypes: new Set(['ApiService', 'Helper']),
      sourceDirs: ['', 'src'],
      workspaceRoot: '/workspace',
      fsOps: createFsOps(['Services/ApiService.cs', 'src/Services/Helper.cs']),
    });

    expect(new Set(resolved)).toEqual(
      new Set(['/workspace/Services/ApiService.cs', '/workspace/src/Services/Helper.cs']),
    );
  });

  it('resolves parent namespace candidate when namespace ends with a used type name', () => {
    const resolved = resolveWithUsedTypes({
      namespace: 'MyApp.Models.User',
      usedTypes: new Set(['User']),
      sourceDirs: ['src'],
      workspaceRoot: '/workspace',
      fsOps: createFsOps(['src/MyApp/Models/User.cs']),
    });

    expect(resolved).toEqual(['/workspace/src/MyApp/Models/User.cs']);
  });

  it('deduplicates repeated matches', () => {
    const resolved = resolveWithUsedTypes({
      namespace: 'MyApp.Services',
      usedTypes: new Set(['ApiService']),
      sourceDirs: ['', ''],
      workspaceRoot: '/workspace',
      fsOps: createFsOps(['Services/ApiService.cs']),
    });

    expect(resolved).toEqual(['/workspace/Services/ApiService.cs']);
  });

  it('returns empty results when no type candidates are found', () => {
    const resolved = resolveWithUsedTypes({
      namespace: 'MyApp.Services',
      usedTypes: new Set(['MissingType']),
      sourceDirs: ['src'],
      workspaceRoot: '/workspace',
      fsOps: createFsOps([]),
    });

    expect(resolved).toEqual([]);
  });
});
