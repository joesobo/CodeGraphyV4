import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appendCSharpUsingImportRelations } from '../../../../src/treeSitter/runtime/analyzeCSharp/usingImports';
import { resolveCSharpTypePathInNamespace } from '../../../../src/treeSitter/runtime/csharpIndex';
import { normalizeCSharpTypeName } from '../../../../src/treeSitter/runtime/analyzeCSharp/resolution';
import { addRelation } from '../../../../src/treeSitter/runtime/analyze/results';

vi.mock('../../../../src/treeSitter/runtime/csharpIndex', () => ({
  resolveCSharpTypePathInNamespace: vi.fn(),
}));

vi.mock('../../../../src/treeSitter/runtime/analyzeCSharp/resolution', () => ({
  normalizeCSharpTypeName: vi.fn((name: string) => name.toUpperCase()),
}));

vi.mock('../../../../src/treeSitter/runtime/analyze/results', () => ({
  addRelation: vi.fn(),
}));

describe('pipeline/plugins/treesitter/runtime/analyzeCSharp/usingImports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('collects matching resolved paths for C# target relations and emits using edges per namespace', () => {
    vi.mocked(resolveCSharpTypePathInNamespace).mockImplementation(
      (_workspaceRoot, _filePath, namespaceName, typeName) => {
        if (namespaceName === 'CodeGraphy.Models' && typeName === 'USER') {
          return '/workspace/src/Models/User.cs';
        }
        if (namespaceName === 'CodeGraphy.Base' && typeName === 'ENTITY') {
          return '/workspace/src/Base/Entity.cs';
        }
        return null;
      },
    );

    const relations = [
      {
        kind: 'type',
        resolvedPath: '/workspace/src/Models/User.cs',
        specifier: 'User',
      },
      {
        kind: 'inherit',
        resolvedPath: '/workspace/src/Base/Entity.cs',
        specifier: 'Entity',
      },
    ] as never[];
    const importTargetsByNamespace = new Map<string, Set<string>>();

    appendCSharpUsingImportRelations(
      '/workspace',
      '/workspace/src/App.cs',
      relations,
      new Set(['CodeGraphy.Models', 'CodeGraphy.Base']),
      importTargetsByNamespace,
    );

    expect(normalizeCSharpTypeName).toHaveBeenCalledWith('User');
    expect(normalizeCSharpTypeName).toHaveBeenCalledWith('Entity');
    expect(importTargetsByNamespace.get('CodeGraphy.Models')).toEqual(
      new Set(['/workspace/src/Models/User.cs']),
    );
    expect(importTargetsByNamespace.get('CodeGraphy.Base')).toEqual(
      new Set(['/workspace/src/Base/Entity.cs']),
    );
    expect(addRelation).toHaveBeenNthCalledWith(
      1,
      relations,
      expect.objectContaining({
        kind: 'using',
        sourceId: 'core:treesitter:using',
        fromFilePath: '/workspace/src/App.cs',
        specifier: 'CodeGraphy.Models',
        resolvedPath: '/workspace/src/Models/User.cs',
        toFilePath: '/workspace/src/Models/User.cs',
      }),
    );
    expect(addRelation).toHaveBeenNthCalledWith(
      2,
      relations,
      expect.objectContaining({
        kind: 'using',
        sourceId: 'core:treesitter:using',
        fromFilePath: '/workspace/src/App.cs',
        specifier: 'CodeGraphy.Base',
        resolvedPath: '/workspace/src/Base/Entity.cs',
        toFilePath: '/workspace/src/Base/Entity.cs',
      }),
    );
  });

  it('ignores unrelated relations and does not emit edges for namespaces without targets', () => {
    const relations = [
      { kind: 'import', resolvedPath: '/workspace/src/Models/User.cs', specifier: 'User' },
      { kind: 'reference', resolvedPath: null, specifier: 'User' },
      { kind: 'reference', resolvedPath: '/workspace/src/Models/User.cs', specifier: null },
    ] as never[];

    appendCSharpUsingImportRelations(
      '/workspace',
      '/workspace/src/App.cs',
      relations,
      new Set(['CodeGraphy.Models']),
      new Map(),
    );

    expect(resolveCSharpTypePathInNamespace).not.toHaveBeenCalled();
    expect(addRelation).not.toHaveBeenCalled();
  });
});
