import { describe, it, expect } from 'vitest';
import { resolveIntraNamespaceTypes } from '../src/pathResolverResolveIntraNamespace';
import type { ResolverFsOps } from '../src/pathResolverFs';

describe('resolveIntraNamespaceTypes', () => {
  function createFsOps(files: string[]): ResolverFsOps {
    const normalized = new Set(files.map(value => value.replace(/\\/g, '/')));

    return {
      fileExists: (relativePath: string) => normalized.has(relativePath.replace(/\\/g, '/')),
      directoryExists: () => false,
      findCsFileInDir: () => null,
    };
  }

  it('adds registered namespace matches and excludes the source file itself', () => {
    const resolved = resolveIntraNamespaceTypes({
      namespace: 'MyApp.Services',
      fromFile: '/workspace/src/Services/OrderService.cs',
      usedTypes: new Set(['OrderService']),
      workspaceRoot: '/workspace',
      sourceDirs: ['src'],
      namespaceToFileMap: new Map<string, string>([
        ['MyApp.Services', 'src/Services/OrderService.cs'],
      ]),
      fsOps: createFsOps([]),
    });

    expect(resolved).toEqual([]);
  });

  it('adds registered namespace matches when the namespace and used type both match', () => {
    const resolved = resolveIntraNamespaceTypes({
      namespace: 'MyApp.Services',
      fromFile: '/workspace/src/Services/Program.cs',
      usedTypes: new Set(['Worker']),
      workspaceRoot: '/workspace',
      sourceDirs: [],
      namespaceToFileMap: new Map<string, string>([
        ['MyApp.Services', 'src/Services/Worker.cs'],
      ]),
      fsOps: createFsOps([]),
    });

    expect(resolved).toEqual(['/workspace/src/Services/Worker.cs']);
  });

  it('adds used-type convention matches and skips paths equal to fromFile', () => {
    const resolved = resolveIntraNamespaceTypes({
      namespace: 'MyApp.Services',
      fromFile: '/workspace/src/Services/ApiService.cs',
      usedTypes: new Set(['ApiService', 'HelperService']),
      workspaceRoot: '/workspace',
      sourceDirs: ['src'],
      namespaceToFileMap: new Map(),
      fsOps: createFsOps(['src/Services/ApiService.cs', 'src/Services/HelperService.cs']),
    });

    expect(resolved).toEqual(['/workspace/src/Services/HelperService.cs']);
  });

  it('adds root source-dir type matches and deduplicates overlap', () => {
    const resolved = resolveIntraNamespaceTypes({
      namespace: 'MyApp',
      fromFile: '/workspace/src/Program.cs',
      usedTypes: new Set(['Config']),
      workspaceRoot: '/workspace',
      sourceDirs: ['', 'src'],
      namespaceToFileMap: new Map<string, string>([['MyApp', 'Config.cs']]),
      fsOps: createFsOps(['Config.cs']),
    });

    expect(resolved).toEqual(['/workspace/Config.cs']);
  });

  it('supports relative fromFile paths by normalizing to workspace absolute path', () => {
    const resolved = resolveIntraNamespaceTypes({
      namespace: 'MyApp.Services',
      fromFile: 'src/Services/Program.cs',
      usedTypes: new Set(['Worker']),
      workspaceRoot: '/workspace',
      sourceDirs: ['src'],
      namespaceToFileMap: new Map(),
      fsOps: createFsOps(['src/Services/Worker.cs']),
    });

    expect(resolved).toEqual(['/workspace/src/Services/Worker.cs']);
  });

  it('ignores registered namespace entries from other namespaces', () => {
    const resolved = resolveIntraNamespaceTypes({
      namespace: 'MyApp.Services',
      fromFile: '/workspace/src/Services/Program.cs',
      usedTypes: new Set(['Worker']),
      workspaceRoot: '/workspace',
      sourceDirs: ['src'],
      namespaceToFileMap: new Map<string, string>([
        ['MyApp.Other', 'src/Other/Worker.cs'],
      ]),
      fsOps: createFsOps([]),
    });

    expect(resolved).toEqual([]);
  });

  it('ignores registered namespace entries when the file name is not used', () => {
    const resolved = resolveIntraNamespaceTypes({
      namespace: 'MyApp.Services',
      fromFile: '/workspace/src/Services/Program.cs',
      usedTypes: new Set(['DifferentType']),
      workspaceRoot: '/workspace',
      sourceDirs: ['src'],
      namespaceToFileMap: new Map<string, string>([
        ['MyApp.Services', 'src/Services/Worker.cs'],
      ]),
      fsOps: createFsOps([]),
    });

    expect(resolved).toEqual([]);
  });

  it('adds root source-dir matches across source directories and skips the current file', () => {
    const resolved = resolveIntraNamespaceTypes({
      namespace: 'MyApp',
      fromFile: '/workspace/Program.cs',
      usedTypes: new Set(['Program', 'Config', 'Helper']),
      workspaceRoot: '/workspace',
      sourceDirs: ['', 'src'],
      namespaceToFileMap: new Map(),
      fsOps: createFsOps(['Program.cs', 'Config.cs', 'src/Helper.cs']),
    });

    expect(new Set(resolved)).toEqual(
      new Set(['/workspace/Config.cs', '/workspace/src/Helper.cs']),
    );
  });
});
