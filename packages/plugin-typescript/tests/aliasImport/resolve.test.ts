import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { comparePathMappingSpecificity, type TypeScriptPathMapping } from '../../src/aliasImport/pathMapping';
import { resolveAliasImport } from '../../src/aliasImport/resolve';
import { createWorkspaceRoot, removeWorkspaceRoot, writeWorkspaceFile } from '../workspace';

describe('TypeScript Alias Import direct target resolution', () => {
  it('sorts exact aliases before more specific wildcard aliases before broad wildcard aliases', () => {
    const mappings: TypeScriptPathMapping[] = [
      { baseUrl: '/repo', key: '@/*', targets: ['src/*'] },
      { baseUrl: '/repo', key: '@/*/component', targets: ['src/*/component'] },
      { baseUrl: '/repo', key: '@/features/*', targets: ['src/features/*'] },
      { baseUrl: '/repo', key: '@/exact', targets: ['src/exact.ts'] },
    ];
    const sortedKeys = mappings.sort(comparePathMappingSpecificity).map(mapping => mapping.key);

    expect(sortedKeys).toHaveLength(4);
    expect(sortedKeys).toEqual([
      '@/exact',
      '@/features/*',
      '@/*/component',
      '@/*',
    ]);
  });

  it('does not resolve exact aliases for different specifiers', () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      const targetPath = writeWorkspaceFile(workspaceRoot, 'src/exact.ts', 'export {};\n');

      expect(resolveAliasImport('@/other', {
        paths: [{ baseUrl: workspaceRoot, key: '@/exact', targets: ['src/exact.ts'] }],
      })).toBeNull();
      expect(resolveAliasImport('@/exact', {
        paths: [{ baseUrl: workspaceRoot, key: '@/exact', targets: ['src/exact.ts'] }],
      })).toBe(targetPath);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('requires wildcard aliases to match both prefix and suffix', () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      const targetPath = writeWorkspaceFile(workspaceRoot, 'src/button/view.ts', 'export {};\n');
      const config = {
        paths: [{ baseUrl: workspaceRoot, key: '@scope/*/view', targets: ['src/*/view.ts'] }],
      };

      expect(resolveAliasImport('@scope/button/view', config)).toBe(targetPath);
      expect(resolveAliasImport('@other/button/view', config)).toBeNull();
      expect(resolveAliasImport('@scope/button/model', config)).toBeNull();
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('resolves extensionless aliases through index files', () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      const targetPath = writeWorkspaceFile(workspaceRoot, 'src/folder/index.ts', 'export {};\n');

      expect(resolveAliasImport('@/folder', {
        paths: [{ baseUrl: workspaceRoot, key: '@/*', targets: ['src/*'] }],
      })).toBe(path.normalize(targetPath));
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });
});
