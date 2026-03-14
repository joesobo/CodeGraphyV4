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
      fromFile: '/workspace/src/Services/CurrentService.cs',
      usedTypes: new Set(['CurrentService', 'OrderService']),
      workspaceRoot: '/workspace',
      sourceDirs: ['src'],
      namespaceToFileMap: new Map<string, string>([
        ['MyApp.Services', 'src/Services/CurrentService.cs'],
        ['MyApp.Services', 'src/Services/OrderService.cs'],
      ]),
      fsOps: createFsOps([]),
    });

    expect(resolved).toEqual(['/workspace/src/Services/OrderService.cs']);
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
});
