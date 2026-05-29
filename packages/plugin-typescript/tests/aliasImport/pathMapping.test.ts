import { describe, expect, it } from 'vitest';
import { comparePathMappingSpecificity, type TypeScriptPathMapping } from '../../src/aliasImport/pathMapping';

describe('TypeScript Alias Import path mapping specificity', () => {
  it('sorts exact aliases before more specific wildcard aliases before broad wildcard aliases', () => {
    const mappings: TypeScriptPathMapping[] = [
      { baseUrl: '/repo', key: '@/*', targets: ['src/*'] },
      { baseUrl: '/repo', key: '@/*/component', targets: ['src/*/component'] },
      { baseUrl: '/repo', key: '@/features/*', targets: ['src/features/*'] },
      { baseUrl: '/repo', key: '@/exact', targets: ['src/exact.ts'] },
    ];

    expect(mappings.sort(comparePathMappingSpecificity).map(mapping => mapping.key)).toEqual([
      '@/exact',
      '@/features/*',
      '@/*/component',
      '@/*',
    ]);
  });
});
