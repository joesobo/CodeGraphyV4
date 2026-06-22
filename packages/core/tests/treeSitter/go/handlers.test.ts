import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleGoCallExpression,
  handleGoCallableDeclaration,
  handleGoTypeSpec,
  handleGoTypeSpecRelations,
} from '../../../src/treeSitter/runtime/analyzeGo/handlers';
import {
  getImportedBindingByIdentifier,
  getImportedBindingByPropertyAccess,
} from '../../../src/treeSitter/runtime/analyze/imports';
import { getIdentifierText } from '../../../src/treeSitter/runtime/analyze/nodes';
import {
  addCallRelation,
  addInheritRelation,
  createSymbol,
  createSymbolId,
} from '../../../src/treeSitter/runtime/analyze/results';
import { walkSymbolBody } from '../../../src/treeSitter/runtime/analyze/walk';

vi.mock('../../../src/treeSitter/runtime/analyze/imports', () => ({
  getImportedBindingByIdentifier: vi.fn(),
  getImportedBindingByPropertyAccess: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyze/results', () => ({
  addCallRelation: vi.fn(),
  addInheritRelation: vi.fn(),
  createSymbol: vi.fn(),
  createSymbolId: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyze/walk', () => ({
  walkSymbolBody: vi.fn(),
}));

function createNode(overrides: Partial<{
  type: string;
  namedChildren: unknown[];
  childForFieldName: (name: string) => unknown;
}> = {}) {
  return {
    type: 'function_declaration',
    namedChildren: [],
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyzeGo/handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates function and method symbols only when declarations have a name', () => {
    const symbols: Array<{ id: string }> = [];
    const symbol = { id: 'go:function:run' };
    vi.mocked(createSymbol).mockReturnValue(symbol as never);
    vi.mocked(walkSymbolBody).mockReturnValue({ skipChildren: true });
    vi.mocked(getIdentifierText)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('run')
      .mockReturnValueOnce('start');

    expect(
      handleGoCallableDeclaration(
        createNode({
          childForFieldName: (name: string) => {
            expect(name).toBe('name');
            return null;
          },
        }) as never,
        '/workspace/app.go',
        symbols as never,
        vi.fn(),
      ),
    ).toBeUndefined();

    expect(
      handleGoCallableDeclaration(
        createNode({
          type: 'function_declaration',
          childForFieldName: (name: string) => {
            expect(name).toBe('name');
            return createNode({ type: 'identifier' });
          },
        }) as never,
        '/workspace/app.go',
        symbols as never,
        vi.fn(),
      ),
    ).toEqual({ skipChildren: true });
    expect(
      handleGoCallableDeclaration(
        createNode({
          type: 'method_declaration',
          childForFieldName: (name: string) => {
            expect(name).toBe('name');
            return createNode({ type: 'field_identifier' });
          },
        }) as never,
        '/workspace/app.go',
        symbols as never,
        vi.fn(),
      ),
    ).toEqual({ skipChildren: true });

    expect(createSymbol).toHaveBeenNthCalledWith(1, '/workspace/app.go', 'function', 'run', expect.anything());
    expect(createSymbol).toHaveBeenNthCalledWith(2, '/workspace/app.go', 'method', 'start', expect.anything());
    expect(symbols).toEqual([symbol, symbol]);
  });

  it('classifies type specs from the type field, named-child fallback, and missing type nodes', () => {
    const symbols: unknown[] = [];
    vi.mocked(getIdentifierText)
      .mockReturnValueOnce('Reader')
      .mockReturnValueOnce('Config')
      .mockReturnValueOnce('Alias')
      .mockReturnValueOnce('Untyped')
      .mockReturnValueOnce(null);
    vi.mocked(createSymbol).mockImplementation((filePath: string, kind: string, name: string) => ({
      id: `${filePath}:${kind}:${name}`,
      kind,
      name,
    }) as never);

    handleGoTypeSpec(
      createNode({
        childForFieldName: (name: string) => {
          if (name === 'name') {
            return createNode({ type: 'identifier' });
          }

          expect(name).toBe('type');
          return createNode({ type: 'interface_type' });
        },
      }) as never,
      '/workspace/app.go',
      symbols as never,
    );
    handleGoTypeSpec(
      createNode({
        namedChildren: [createNode({ type: 'struct_type' })],
        childForFieldName: (name: string) => (name === 'name' ? createNode({ type: 'identifier' }) : null),
      }) as never,
      '/workspace/app.go',
      symbols as never,
    );
    handleGoTypeSpec(
      createNode({
        namedChildren: [createNode({ type: 'type_identifier' })],
        childForFieldName: (name: string) => (name === 'name' ? createNode({ type: 'identifier' }) : null),
      }) as never,
      '/workspace/app.go',
      symbols as never,
    );
    handleGoTypeSpec(
      createNode({
        childForFieldName: (name: string) => {
          expect(['name', 'type']).toContain(name);
          return name === 'name' ? createNode({ type: 'identifier' }) : null;
        },
      }) as never,
      '/workspace/app.go',
      symbols as never,
    );
    handleGoTypeSpec(
      createNode({
        childForFieldName: (name: string) => {
          expect(name).toBe('name');
          return null;
        },
      }) as never,
      '/workspace/app.go',
      symbols as never,
    );

    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'interface', name: 'Reader' }),
      expect.objectContaining({ kind: 'struct', name: 'Config' }),
      expect.objectContaining({ kind: 'type', name: 'Alias' }),
      expect.objectContaining({ kind: 'type', name: 'Untyped' }),
    ]);
  });

  it('adds embedded struct inheritance relations with optional symbol endpoints', () => {
    const relations: unknown[] = [];
    const qualifiedTypeNode = createNode({ type: 'qualified_type' });
    const fieldDeclarationNode = createNode({
      type: 'field_declaration',
      namedChildren: [qualifiedTypeNode],
    });
    const structNode = createNode({
      type: 'struct_type',
      descendantsOfType: (type: string) => {
        expect(type).toBe('field_declaration');
        return [fieldDeclarationNode];
      },
    } as never);
    const binding = { importedName: 'model', resolvedPath: '/workspace/internal/model/model.go' };

    Object.defineProperty(qualifiedTypeNode, 'text', { value: 'model.Audited' });
    vi.mocked(getIdentifierText)
      .mockReturnValueOnce('TaskRunner')
      .mockReturnValueOnce('model')
      .mockReturnValueOnce('TaskRunner')
      .mockReturnValueOnce('model');
    vi.mocked(createSymbol).mockReturnValue({ id: 'task-runner-symbol' } as never);
    vi.mocked(createSymbolId).mockReturnValue('/workspace/service.go:struct:TaskRunner');

    handleGoTypeSpec(
      createNode({
        childForFieldName: (name: string) =>
          name === 'name' ? createNode({ type: 'identifier' }) : structNode,
      }) as never,
      '/workspace/service.go',
      [] as never[],
      relations as never[],
      new Map([['model', binding as never]]),
      { includeSymbolEndpoint: true },
    );
    handleGoTypeSpecRelations(
      createNode({
        childForFieldName: (name: string) =>
          name === 'name' ? createNode({ type: 'identifier' }) : structNode,
      }) as never,
      '/workspace/service.go',
      relations as never[],
      new Map([['model', binding as never]]),
    );

    expect(addInheritRelation).toHaveBeenNthCalledWith(
      1,
      relations,
      '/workspace/service.go',
      'model.Audited',
      '/workspace/internal/model/model.go',
      '/workspace/service.go:struct:TaskRunner',
    );
    expect(addInheritRelation).toHaveBeenNthCalledWith(
      2,
      relations,
      '/workspace/service.go',
      'model.Audited',
      '/workspace/internal/model/model.go',
      undefined,
    );
  });

  it('adds call relations for function-field identifiers, named-child selector fallbacks, and missing bindings', () => {
    const binding = { importedName: 'fmt', specifier: 'fmt', resolvedPath: null };
    const functionFieldNode = createNode({ type: 'identifier' });
    const selectorNode = createNode({ type: 'selector_expression' });
    const fallbackSelectorNode = createNode({ type: 'selector_expression' });

    vi.mocked(getImportedBindingByIdentifier)
      .mockImplementationOnce((node) => {
        expect(node).toBe(functionFieldNode);
        return binding as never;
      })
      .mockImplementationOnce((node) => {
        expect(node).toBe(selectorNode);
        return null;
      })
      .mockImplementationOnce((node) => {
        expect(node).toBe(fallbackSelectorNode);
        return null;
      });
    vi.mocked(getImportedBindingByPropertyAccess)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(binding as never)
      .mockReturnValueOnce(null);

    handleGoCallExpression(
      createNode({
        childForFieldName: (name: string) => {
          expect(name).toBe('function');
          return functionFieldNode;
        },
        namedChildren: [createNode({ type: 'ignored' })],
      }) as never,
      '/workspace/app.go',
      [] as never[],
      new Map(),
      'symbol-id',
    );
    handleGoCallExpression(
      createNode({
        childForFieldName: (name: string) => {
          expect(name).toBe('function');
          return selectorNode;
        },
        namedChildren: [createNode({ type: 'ignored' })],
      }) as never,
      '/workspace/app.go',
      [] as never[],
      new Map(),
      'symbol-id',
    );
    handleGoCallExpression(
      createNode({
        namedChildren: [fallbackSelectorNode],
        childForFieldName: (name: string) => {
          expect(name).toBe('function');
          return null;
        },
      }) as never,
      '/workspace/app.go',
      [] as never[],
      new Map(),
      'symbol-id',
    );

    expect(addCallRelation).toHaveBeenCalledTimes(2);
    expect(addCallRelation).toHaveBeenNthCalledWith(1, [], '/workspace/app.go', binding, 'symbol-id');
    expect(addCallRelation).toHaveBeenNthCalledWith(2, [], '/workspace/app.go', binding, 'symbol-id');
    expect(vi.mocked(getImportedBindingByPropertyAccess).mock.calls[0]?.[0]).toEqual(expect.objectContaining({ type: 'selector_expression' }));
    expect(vi.mocked(getImportedBindingByPropertyAccess).mock.calls[0]?.[2]).toBe('selector_expression');
    expect(vi.mocked(getImportedBindingByPropertyAccess).mock.calls[0]?.[3]).toBe('operand');
    expect(vi.mocked(getImportedBindingByPropertyAccess).mock.calls[1]?.[0]).toEqual(expect.objectContaining({ type: 'selector_expression' }));
    expect(vi.mocked(getImportedBindingByPropertyAccess).mock.calls[1]?.[2]).toBe('selector_expression');
    expect(vi.mocked(getImportedBindingByPropertyAccess).mock.calls[1]?.[3]).toBe('operand');
  });
});
