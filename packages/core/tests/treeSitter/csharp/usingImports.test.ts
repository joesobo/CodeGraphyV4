import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appendCSharpUsingImportRelations } from '../../../src/treeSitter/runtime/analyzeCSharp/usingImports';
import { resolveCSharpTypePathInNamespace } from '../../../src/treeSitter/runtime/csharpIndex';
import { normalizeCSharpTypeName } from '../../../src/treeSitter/runtime/analyzeCSharp/resolution';
import { addImportRelation } from '../../../src/treeSitter/runtime/analyze/results';

vi.mock('../../../src/treeSitter/runtime/csharpIndex', () => ({
  resolveCSharpTypePathInNamespace: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyzeCSharp/resolution', () => ({
  normalizeCSharpTypeName: vi.fn((name: string) => name.toUpperCase()),
}));

vi.mock('../../../src/treeSitter/runtime/analyze/results', () => ({
  addImportRelation: vi.fn(),
}));

describe('pipeline/plugins/treesitter/runtime/analyzeCSharp/usingImports', () => {
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
        edgeType: 'reference',
        sourceId: 'codegraphy.treesitter:reference',
        from: { kind: 'file', filePath: '/workspace/src/App.cs' },
        target: { kind: 'file', path: '/workspace/src/Models/User.cs', pathKind: 'absolute', specifier: 'User' },
      },
      {
        edgeType: 'inherit',
        sourceId: 'codegraphy.treesitter:inherit',
        from: { kind: 'file', filePath: '/workspace/src/App.cs' },
        target: { kind: 'file', path: '/workspace/src/Base/Entity.cs', pathKind: 'absolute', specifier: 'Entity' },
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
      {
        edgeType: 'import',
        sourceId: 'codegraphy.treesitter:import',
        from: { kind: 'file', filePath: '/workspace/src/App.cs' },
        target: { kind: 'file', path: '/workspace/src/Models/User.cs', pathKind: 'absolute', specifier: 'User' },
      },
      {
        edgeType: 'reference',
        sourceId: 'codegraphy.treesitter:reference',
        from: { kind: 'file', filePath: '/workspace/src/App.cs' },
        target: { kind: 'unresolved', specifier: 'User' },
      },
      {
        edgeType: 'reference',
        sourceId: 'codegraphy.treesitter:reference',
        from: { kind: 'file', filePath: '/workspace/src/App.cs' },
        target: { kind: 'file', path: '/workspace/src/Models/User.cs', pathKind: 'absolute' },
      },
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
