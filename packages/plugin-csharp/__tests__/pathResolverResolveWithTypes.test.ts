import { describe, it, expect } from 'vitest';
import { resolveUsingWithTypes } from '../src/pathResolverResolveWithTypes';
import type { ResolverFsOps } from '../src/pathResolverFs';
import type { IDetectedUsing } from '../src/parserTypes';

describe('resolveUsingWithTypes', () => {
  function createFsOps(files: string[]): ResolverFsOps {
    const normalized = new Set(files.map(value => value.replace(/\\/g, '/')));

    return {
      fileExists: (relativePath: string) => normalized.has(relativePath.replace(/\\/g, '/')),
      directoryExists: () => false,
      findCsFileInDir: () => null,
    };
  }

  function createUsing(namespace: string): IDetectedUsing {
    return {
      namespace,
      line: 1,
      isStatic: false,
      isGlobal: false,
    };
  }

  it('returns empty results for external namespaces', () => {
    const resolved = resolveUsingWithTypes({
      usingDirective: createUsing('System.Collections.Generic'),
      usedTypes: new Set(['List']),
      workspaceRoot: '/workspace',
      sourceDirs: ['src'],
      namespaceToFileMap: new Map(),
      fsOps: createFsOps(['src/List.cs']),
    });

    expect(resolved).toEqual([]);
  });

  it('includes registered namespace file when the file name is used', () => {
    const namespaceToFileMap = new Map<string, string>([['MyApp.Services', 'Services/UserService.cs']]);

    const resolved = resolveUsingWithTypes({
      usingDirective: createUsing('MyApp.Services'),
      usedTypes: new Set(['UserService']),
      workspaceRoot: '/workspace',
      sourceDirs: ['src'],
      namespaceToFileMap,
      fsOps: createFsOps([]),
    });

    expect(resolved).toEqual(['/workspace/Services/UserService.cs']);
  });

  it('merges registered and convention matches without duplicates', () => {
    const namespaceToFileMap = new Map<string, string>([['MyApp.Services', 'Services/UserService.cs']]);

    const resolved = resolveUsingWithTypes({
      usingDirective: createUsing('MyApp.Services'),
      usedTypes: new Set(['UserService', 'OrderService']),
      workspaceRoot: '/workspace',
      sourceDirs: [''],
      namespaceToFileMap,
      fsOps: createFsOps(['Services/UserService.cs', 'Services/OrderService.cs']),
    });

    expect(new Set(resolved)).toEqual(
      new Set(['/workspace/Services/UserService.cs', '/workspace/Services/OrderService.cs']),
    );
  });

  it('ignores registered namespace files when type name is not used', () => {
    const namespaceToFileMap = new Map<string, string>([['MyApp.Services', 'Services/UserService.cs']]);

    const resolved = resolveUsingWithTypes({
      usingDirective: createUsing('MyApp.Services'),
      usedTypes: new Set(['DifferentType']),
      workspaceRoot: '/workspace',
      sourceDirs: ['src'],
      namespaceToFileMap,
      fsOps: createFsOps([]),
    });

    expect(resolved).toEqual([]);
  });
});
