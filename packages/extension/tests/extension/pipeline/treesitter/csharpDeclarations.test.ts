import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleCSharpMethodDeclaration,
  handleCSharpTypeDeclaration,
} from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/csharp/declarations';
import { getCSharpTypeDeclarationKind, resolveCSharpUsingImport } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/csharp/resolution';
import { getIdentifierText } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';
import { addInheritRelation, createSymbol } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results';

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/csharp/resolution', () => ({
  getCSharpTypeDeclarationKind: vi.fn(),
  resolveCSharpUsingImport: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  addInheritRelation: vi.fn(),
  createSymbol: vi.fn(),
}));

function createNode(overrides: Partial<{
  type: string;
  text: string;
  parent: unknown;
  namedChildren: unknown[];
  childForFieldName: (name: string) => unknown;
  descendantsOfType: (types: string[]) => Array<{ text: string; parent?: { type?: string } }>;
}> = {}) {
  return {
    type: 'class_declaration',
    text: '',
    parent: null,
    namedChildren: [],
    childForFieldName: () => null,
    descendantsOfType: () => [],
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyze/csharp/declarations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates type symbols and inherit relations for base-list entries', () => {
    const state = { currentNamespace: 'CodeGraphy.App' };
    const importTargetsByNamespace = new Map<string, Set<string>>();
    vi.mocked(getIdentifierText).mockReturnValue('Program');
    vi.mocked(getCSharpTypeDeclarationKind).mockReturnValue('class');
    vi.mocked(resolveCSharpUsingImport).mockReturnValue('/workspace/src/BaseController.cs');
    vi.mocked(createSymbol).mockReturnValue({ id: 'csharp:Program' } as never);

    handleCSharpTypeDeclaration(
      createNode({
        childForFieldName: (name: string) => {
          expect(name).toBe('name');
          return createNode({ type: 'identifier' });
        },
        descendantsOfType: (types: string[]) => {
          expect(types).toEqual(['identifier', 'qualified_name']);
          return [
            { text: 'BaseController', parent: { type: 'base_list' } },
            { text: 'Ignored', parent: { type: 'argument_list' } },
            { text: 'Contracts.ITracked', parent: { type: 'base_list' } },
            { text: 'Detached', parent: undefined },
          ];
        },
      }) as never,
      state as never,
      '/workspace/src/Program.cs',
      '/workspace',
      [] as never[],
      [] as never[],
      new Set(['CodeGraphy.Contracts']),
      importTargetsByNamespace,
    );

    expect(createSymbol).toHaveBeenCalledWith('/workspace/src/Program.cs', 'class', 'Program', expect.anything());
    expect(addInheritRelation).toHaveBeenCalledTimes(2);
    expect(resolveCSharpUsingImport).toHaveBeenNthCalledWith(
      1,
      '/workspace',
      '/workspace/src/Program.cs',
      new Set(['CodeGraphy.Contracts']),
      importTargetsByNamespace,
      'BaseController',
      'CodeGraphy.App',
    );
  });

  it('skips symbol creation when the type declaration name is missing', () => {
    vi.mocked(getIdentifierText).mockReturnValue(null);

    handleCSharpTypeDeclaration(
      createNode({
        childForFieldName: (name: string) => {
          expect(name).toBe('name');
          return null;
        },
      }) as never,
      { currentNamespace: null } as never,
      '/workspace/src/Missing.cs',
      '/workspace',
      [] as never[],
      [] as never[],
      new Set(),
      new Map(),
    );

    expect(createSymbol).not.toHaveBeenCalled();
  });

  it('skips inheritance work for enums but still records the symbol when named', () => {
    vi.mocked(getIdentifierText).mockReturnValue('Status');
    vi.mocked(getCSharpTypeDeclarationKind).mockReturnValue('enum');
    const descendantsOfType = vi.fn(() => [{ text: 'Ignored', parent: { type: 'base_list' } }]);

    handleCSharpTypeDeclaration(
      createNode({
        type: 'enum_declaration',
        childForFieldName: (name: string) => {
          expect(name).toBe('name');
          return createNode({ type: 'identifier' });
        },
        descendantsOfType,
      }) as never,
      { currentNamespace: null } as never,
      '/workspace/src/Status.cs',
      '/workspace',
      [] as never[],
      [] as never[],
      new Set(),
      new Map(),
    );

    expect(createSymbol).toHaveBeenCalledWith('/workspace/src/Status.cs', 'enum', 'Status', expect.anything());
    expect(addInheritRelation).not.toHaveBeenCalled();
    expect(descendantsOfType).not.toHaveBeenCalled();
  });

  it('walks method bodies with the current symbol id, skips unnamed methods, and ignores missing bodies', () => {
    const symbols: Array<{ id: string }> = [];
    const symbol = { id: 'csharp:Run' };
    const walk = vi.fn();
    const body = createNode({ type: 'block' });
    vi.mocked(createSymbol).mockReturnValue(symbol as never);
    vi.mocked(getIdentifierText)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('Run')
      .mockReturnValueOnce('Render')
      .mockReturnValueOnce('NoBody');

    expect(
      handleCSharpMethodDeclaration(
        createNode({
          childForFieldName: (name: string) => {
            expect(name).toBe('name');
            return null;
          },
        }) as never,
        { currentSymbolId: null } as never,
        '/workspace/src/Program.cs',
        symbols as never,
        walk,
      ),
    ).toBeUndefined();
    expect(
      handleCSharpMethodDeclaration(
        createNode({
          childForFieldName: (name: string) => {
            if (name === 'name') {
              return createNode({ type: 'identifier' });
            }

            expect(name).toBe('body');
            return body;
          },
        }) as never,
        { currentSymbolId: null } as never,
        '/workspace/src/Program.cs',
        symbols as never,
        walk,
      ),
    ).toEqual({ skipChildren: true });
    expect(
      handleCSharpMethodDeclaration(
        createNode({
          namedChildren: [body],
          childForFieldName: (name: string) => {
            expect(['name', 'body']).toContain(name);
            return name === 'name' ? createNode({ type: 'identifier' }) : null;
          },
        }) as never,
        { currentSymbolId: null } as never,
        '/workspace/src/Program.cs',
        symbols as never,
        walk,
      ),
    ).toEqual({ skipChildren: true });
    expect(
      handleCSharpMethodDeclaration(
        createNode({
          childForFieldName: (name: string) => {
            expect(['name', 'body']).toContain(name);
            return name === 'name' ? createNode({ type: 'identifier' }) : null;
          },
        }) as never,
        { currentSymbolId: null } as never,
        '/workspace/src/Program.cs',
        symbols as never,
        walk,
      ),
    ).toEqual({ skipChildren: true });

    expect(createSymbol).toHaveBeenNthCalledWith(1, '/workspace/src/Program.cs', 'method', 'Run', expect.anything());
    expect(createSymbol).toHaveBeenNthCalledWith(2, '/workspace/src/Program.cs', 'method', 'Render', expect.anything());
    expect(createSymbol).toHaveBeenNthCalledWith(3, '/workspace/src/Program.cs', 'method', 'NoBody', expect.anything());
    expect(walk).toHaveBeenCalledTimes(2);
    expect(walk).toHaveBeenCalledWith(body, { currentSymbolId: 'csharp:Run' });
  });
});
