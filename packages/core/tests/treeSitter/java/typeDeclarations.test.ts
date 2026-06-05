import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleJavaTypeDeclaration } from '../../../src/treeSitter/runtime/analyzeJava/typeDeclarations';
import { getIdentifierText } from '../../../src/treeSitter/runtime/analyze/nodes';
import { addRelation, createSymbol, createSymbolId } from '../../../src/treeSitter/runtime/analyze/results';
import { resolveJavaTypePath } from '../../../src/treeSitter/runtime/projectRoots';

vi.mock('../../../src/treeSitter/runtime/projectRoots', () => ({
  resolveJavaTypePath: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyze/results', () => ({
  addRelation: vi.fn(),
  createSymbol: vi.fn(),
  createSymbolId: vi.fn((filePath: string, kind: string, name: string) => `${filePath}:${kind}:${name}`),
}));

function createNode(overrides: Partial<{
  type: string;
  descendantsOfType: (type: string) => unknown[];
  namedChildren: unknown[];
  childForFieldName: (name: string) => unknown;
}> = {}) {
  return {
    type: 'class_declaration',
    descendantsOfType: () => [],
    namedChildren: [],
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyzeJava/typeDeclarations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveJavaTypePath).mockImplementation((_sourceRoot: string | null, typeName: string) =>
      typeName === 'com.example.BaseService' ? '/workspace/src/com/example/BaseService.java' : null,
    );
  });

  it('creates symbols for class, interface, and enum declarations while skipping unnamed nodes', () => {
    const symbols: unknown[] = [];
    vi.mocked(getIdentifierText)
      .mockReturnValueOnce('App')
      .mockReturnValueOnce('Runnable')
      .mockReturnValueOnce('Status')
      .mockReturnValueOnce(null);
    vi.mocked(createSymbol).mockImplementation((_filePath: string, kind: string, name: string) => ({ kind, name }) as never);

    handleJavaTypeDeclaration(
      createNode({
        type: 'class_declaration',
        childForFieldName: (name: string) => {
          if (name === 'name') {
            return createNode({ type: 'identifier' });
          }

          expect(name).toBe('superclass');
          return null;
        },
      }) as never,
      '/workspace/App.java',
      '/workspace/src',
      'com.example',
      [],
      symbols as never,
      new Map(),
    );
    handleJavaTypeDeclaration(
      createNode({
        type: 'interface_declaration',
        childForFieldName: (name: string) => {
          expect(name).toBe('name');
          return createNode({ type: 'identifier' });
        },
      }) as never,
      '/workspace/App.java',
      '/workspace/src',
      'com.example',
      [],
      symbols as never,
      new Map(),
    );
    handleJavaTypeDeclaration(
      createNode({
        type: 'enum_declaration',
        childForFieldName: (name: string) => {
          expect(name).toBe('name');
          return createNode({ type: 'identifier' });
        },
      }) as never,
      '/workspace/App.java',
      '/workspace/src',
      'com.example',
      [],
      symbols as never,
      new Map(),
    );
    handleJavaTypeDeclaration(
      createNode({
        type: 'class_declaration',
        childForFieldName: (name: string) => {
          expect(name).toBe('name');
          return null;
        },
      }) as never,
      '/workspace/App.java',
      '/workspace/src',
      'com.example',
      [],
      symbols as never,
      new Map(),
    );

    expect(symbols).toEqual([
      { kind: 'class', name: 'App' },
      { kind: 'interface', name: 'Runnable' },
      { kind: 'enum', name: 'Status' },
    ]);
  });

  it('adds symbol inheritance for Java class extends declarations', () => {
    const symbols: unknown[] = [];
    const relations: unknown[] = [];
    vi.mocked(getIdentifierText)
      .mockReturnValueOnce('App')
      .mockReturnValueOnce('BaseService');
    vi.mocked(createSymbol).mockReturnValue({ id: '/workspace/src/com/example/App.java:class:App' } as never);

    handleJavaTypeDeclaration(
      createNode({
        type: 'class_declaration',
        childForFieldName: (name: string) =>
          name === 'name'
            ? createNode({ type: 'identifier' })
            : createNode({
              type: 'superclass',
              namedChildren: [createNode({ type: 'type_identifier' })],
              descendantsOfType: (type: string) => {
                expect(type).toBe('type_identifier');
                return [createNode({ type: 'type_identifier' })];
              },
            }),
      }) as never,
      '/workspace/src/com/example/App.java',
      '/workspace/src',
      'com.example',
      relations as never,
      symbols as never,
      new Map(),
    );

    expect(resolveJavaTypePath).toHaveBeenCalledWith('/workspace/src', 'com.example.BaseService');
    expect(createSymbolId).toHaveBeenCalledWith(
      '/workspace/src/com/example/BaseService.java',
      'class',
      'BaseService',
    );
    expect(addRelation).toHaveBeenCalledWith(relations, {
      kind: 'inherit',
      sourceId: 'codegraphy.treesitter:inherit',
      fromFilePath: '/workspace/src/com/example/App.java',
      fromSymbolId: '/workspace/src/com/example/App.java:class:App',
      specifier: 'BaseService',
      toSymbolId: '/workspace/src/com/example/BaseService.java:class:BaseService',
    });
  });
});
