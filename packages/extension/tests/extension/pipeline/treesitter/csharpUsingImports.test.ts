import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appendCSharpUsingImportRelations } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/csharp/usingImports';
import { resolveCSharpTypePathInNamespace } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex';
import { normalizeCSharpTypeName } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/csharp/resolution';
import { addImportRelation } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results';

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex', () => ({
  resolveCSharpTypePathInNamespace: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/csharp/resolution', () => ({
  normalizeCSharpTypeName: vi.fn((name: string) => name.toUpperCase()),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  addImportRelation: vi.fn(),
}));

describe('pipeline/plugins/treesitter/runtime/analyze/csharp/usingImports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('collects matching resolved paths for reference and inherit relations and emits imports per namespace', () => {
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
        kind: 'reference',
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
    expect(addImportRelation).toHaveBeenNthCalledWith(
      1,
      relations,
      '/workspace/src/App.cs',
      'CodeGraphy.Models',
      '/workspace/src/Models/User.cs',
    );
    expect(addImportRelation).toHaveBeenNthCalledWith(
      2,
      relations,
      '/workspace/src/App.cs',
      'CodeGraphy.Base',
      '/workspace/src/Base/Entity.cs',
    );
  });

  it('ignores unrelated relations and emits null imports for namespaces without targets', () => {
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
    expect(addImportRelation).toHaveBeenCalledWith(
      relations,
      '/workspace/src/App.cs',
      'CodeGraphy.Models',
      null,
    );
  });
});
