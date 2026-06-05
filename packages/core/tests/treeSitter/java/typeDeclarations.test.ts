import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleJavaTypeDeclaration } from '../../../src/treeSitter/runtime/analyzeJava/typeDeclarations';
import { getIdentifierText } from '../../../src/treeSitter/runtime/analyze/nodes';
import { addInheritRelation, createSymbol } from '../../../src/treeSitter/runtime/analyze/results';

vi.mock('../../../src/treeSitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyze/results', () => ({
  addInheritRelation: vi.fn(),
  createSymbol: vi.fn(),
}));

function createNode(overrides: Partial<{
  type: string;
  text: string;
  childForFieldName: (name: string) => unknown;
}> = {}) {
  return {
    type: 'class_declaration',
    text: '',
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyzeJava/typeDeclarations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          expect(name).toBe('name');
          return createNode({ type: 'identifier' });
        },
      }) as never,
      '/workspace/App.java',
      null,
      null,
      [],
      symbols as never,
      new Map(),
      true,
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
      null,
      null,
      [],
      symbols as never,
      new Map(),
      true,
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
      null,
      null,
      [],
      symbols as never,
      new Map(),
      true,
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
      null,
      null,
      [],
      symbols as never,
      new Map(),
      true,
    );

    expect(symbols).toEqual([
      { kind: 'class', name: 'App' },
      { kind: 'interface', name: 'Runnable' },
      { kind: 'enum', name: 'Status' },
    ]);
    expect(addInheritRelation).not.toHaveBeenCalled();
  });
});
