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

  it('does not resolve root files for non-matching namespaces', () => {
    const resolved = resolveWithUsedTypes({
      namespace: 'MyApp.Services',
      usedTypes: new Set(['Helper']),
      sourceDirs: [''],
      workspaceRoot: '/workspace',
      fsOps: createFsOps(['Helper.cs']),
    });

    expect(resolved).toEqual([]);
  });

  it('resolves root-level parent candidates when namespace equals the used type', () => {
    const resolved = resolveWithUsedTypes({
      namespace: 'Helper',
      usedTypes: new Set(['Helper']),
      sourceDirs: ['', 'src'],
      workspaceRoot: '/workspace',
      fsOps: createFsOps(['Helper.cs', 'src/Helper.cs']),
    });

    expect(new Set(resolved)).toEqual(
      new Set(['/workspace/Helper.cs', '/workspace/src/Helper.cs']),
    );
  });

  it('does not resolve parent candidates when used type does not match namespace suffix', () => {
    const resolved = resolveWithUsedTypes({
      namespace: 'MyApp.Models.Foo',
      usedTypes: new Set(['Bar']),
      sourceDirs: ['src'],
      workspaceRoot: '/workspace',
      fsOps: createFsOps(['src/MyApp/Models/Bar.cs']),
    });

    expect(resolved).toEqual([]);
  });

  it('uses slash-delimited namespace paths for direct candidate lookup', () => {
    const resolved = resolveWithUsedTypes({
      namespace: 'MyApp.Domain',
      usedTypes: new Set(['Entity']),
      sourceDirs: ['src'],
      workspaceRoot: '/workspace',
      fsOps: createFsOps(['src/MyApp/Domain/Entity.cs']),
    });

    expect(resolved).toEqual(['/workspace/src/MyApp/Domain/Entity.cs']);
  });
});
