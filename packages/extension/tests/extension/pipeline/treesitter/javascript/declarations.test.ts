import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleJavaScriptClassDeclaration,
  handleJavaScriptFunctionDeclaration,
  handleJavaScriptMethodDefinition,
  handleJavaScriptVariableDeclarator,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeJavaScript/declarations';
import { getVariableAssignedFunctionSymbol } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/imports';
import { getIdentifierText } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';
import { createSymbol } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results';
import { walkSymbolBody } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/walk';

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/imports', () => ({
  getVariableAssignedFunctionSymbol: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  createSymbol: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/walk', () => ({
  walkSymbolBody: vi.fn(),
}));

function createNode(
  overrides: Partial<{
    type: string;
    namedChildren: unknown[];
    childForFieldName: (name: string) => unknown;
  }> = {},
) {
  return {
    type: 'node',
    namedChildren: [],
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyzeJavaScript/declarations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a function symbol from the name field and walks the body', () => {
    const nameNode = createNode({ type: 'identifier' });
    const childForFieldName = vi.fn((name: string) => {
      expect(name).toBe('name');
      return nameNode;
    });
    const node = createNode({
      type: 'function_declaration',
      childForFieldName,
      namedChildren: [createNode({ type: 'fallback_name' })],
    });
    const fallbackName = node.namedChildren[0];
    const symbol = { id: 'symbol:function:run' };
    const symbols: never[] = [];
    const walk = vi.fn();
    vi.mocked(getIdentifierText).mockImplementation((value) => {
      if (value === nameNode) {
        return 'run';
      }
      if (value === fallbackName) {
        return 'fallback';
      }
      return null;
    });
    vi.mocked(createSymbol).mockReturnValue(symbol as never);
    vi.mocked(walkSymbolBody).mockReturnValue({ skipChildren: true });

    expect(handleJavaScriptFunctionDeclaration(node as never, '/workspace/app.ts', symbols, walk)).toEqual({
      skipChildren: true,
    });
    expect(createSymbol).toHaveBeenCalledWith('/workspace/app.ts', 'function', 'run', node);
    expect(symbols).toEqual([symbol]);
    expect(walkSymbolBody).toHaveBeenCalledWith(node, 'symbol:function:run', walk);
  });

  it('creates a class symbol from the first named child when the name field is absent', () => {
    const fallbackName = createNode({ type: 'identifier' });
    const node = createNode({
      type: 'class_declaration',
      namedChildren: [fallbackName],
    });
    const symbol = { id: 'symbol:class:Runner' };
    const symbols: never[] = [];
    vi.mocked(getIdentifierText).mockReturnValue('Runner');
    vi.mocked(createSymbol).mockReturnValue(symbol as never);

    handleJavaScriptClassDeclaration(node as never, '/workspace/app.ts', symbols);

    expect(getIdentifierText).toHaveBeenCalledWith(fallbackName);
    expect(createSymbol).toHaveBeenCalledWith('/workspace/app.ts', 'class', 'Runner', node);
    expect(symbols).toEqual([symbol]);
  });

  it('skips class declarations when the name is missing', () => {
    const symbols: never[] = [];
    const childForFieldName = vi.fn((name: string) => {
      expect(name).toBe('name');
      return null;
    });
    vi.mocked(getIdentifierText).mockReturnValue(null);

    handleJavaScriptClassDeclaration(
      createNode({ type: 'class_declaration', childForFieldName, namedChildren: [createNode()] }) as never,
      '/workspace/app.ts',
      symbols,
    );

    expect(createSymbol).not.toHaveBeenCalled();
    expect(symbols).toEqual([]);
  });

  it('skips function declarations when the name field is present but empty', () => {
    const childForFieldName = vi.fn((name: string) => {
      expect(name).toBe('name');
      return createNode({ type: 'identifier' });
    });
    const symbols: never[] = [];
    vi.mocked(getIdentifierText).mockReturnValue('');

    expect(
      handleJavaScriptFunctionDeclaration(
        createNode({ type: 'function_declaration', childForFieldName, namedChildren: [createNode()] }) as never,
        '/workspace/app.ts',
        symbols,
        vi.fn(),
      ),
    ).toBeUndefined();
    expect(createSymbol).not.toHaveBeenCalled();
    expect(walkSymbolBody).not.toHaveBeenCalled();
    expect(symbols).toEqual([]);
  });

  it('skips method definitions when the name is missing', () => {
    const symbols: never[] = [];
    vi.mocked(getIdentifierText).mockReturnValue(null);

    expect(
      handleJavaScriptMethodDefinition(createNode({ type: 'method_definition' }) as never, '/workspace/app.ts', symbols, vi.fn()),
    ).toBeUndefined();
    expect(createSymbol).not.toHaveBeenCalled();
    expect(walkSymbolBody).not.toHaveBeenCalled();
    expect(symbols).toEqual([]);
  });

  it('creates a method symbol from the fallback child and walks its body', () => {
    const fallbackName = createNode({ type: 'property_identifier' });
    const node = createNode({
      type: 'method_definition',
      namedChildren: [fallbackName],
      childForFieldName: (name: string) => {
        expect(name).toBe('name');
        return null;
      },
    });
    const symbol = { id: 'symbol:method:render' };
    const symbols: never[] = [];
    const walk = vi.fn();
    vi.mocked(getIdentifierText).mockReturnValue('render');
    vi.mocked(createSymbol).mockReturnValue(symbol as never);
    vi.mocked(walkSymbolBody).mockReturnValue({ skipChildren: true });

    expect(handleJavaScriptMethodDefinition(node as never, '/workspace/app.ts', symbols, walk)).toEqual({
      skipChildren: true,
    });
    expect(getIdentifierText).toHaveBeenCalledWith(fallbackName);
    expect(createSymbol).toHaveBeenCalledWith('/workspace/app.ts', 'method', 'render', node);
    expect(walkSymbolBody).toHaveBeenCalledWith(node, 'symbol:method:render', walk);
    expect(symbols).toEqual([symbol]);
  });

  it('walks the function body from the value field when a variable declarator resolves to a function symbol', () => {
    const bodyNode = createNode({ type: 'statement_block' });
    const valueNode = createNode({
      type: 'arrow_function',
      childForFieldName: (name: string) => {
        expect(name).toBe('body');
        return bodyNode;
      },
    });
    const node = createNode({
      type: 'variable_declarator',
      childForFieldName: (name: string) => {
        expect(name).toBe('value');
        return valueNode;
      },
      namedChildren: [createNode({ type: 'identifier' }), valueNode],
    });
    const symbol = { id: 'symbol:function:assigned' };
    const symbols: never[] = [];
    const walk = vi.fn();
    vi.mocked(getVariableAssignedFunctionSymbol).mockReturnValue(symbol as never);

    expect(handleJavaScriptVariableDeclarator(node as never, '/workspace/app.ts', symbols, walk)).toEqual({
      skipChildren: true,
    });
    expect(symbols).toEqual([symbol]);
    expect(walk).toHaveBeenCalledWith(bodyNode, { currentSymbolId: 'symbol:function:assigned' });
  });

  it('falls back to the last named child for both the value node and body node', () => {
    const wrongValueNode = createNode({ type: 'initializer' });
    const fallbackBody = createNode({ type: 'statement_block' });
    const fallbackValue = createNode({
      type: 'function_expression',
      namedChildren: [createNode({ type: 'parameters' }), createNode({ type: 'decorator' }), fallbackBody],
      childForFieldName: (name: string) => {
        expect(name).toBe('body');
        return null;
      },
    });
    const node = createNode({
      type: 'variable_declarator',
      childForFieldName: (name: string) => {
        expect(name).toBe('value');
        return null;
      },
      namedChildren: [createNode({ type: 'identifier' }), wrongValueNode, fallbackValue],
    });
    const symbol = { id: 'symbol:function:fallback' };
    const symbols: never[] = [];
    const walk = vi.fn();
    vi.mocked(getVariableAssignedFunctionSymbol).mockReturnValue(symbol as never);

    expect(handleJavaScriptVariableDeclarator(node as never, '/workspace/app.ts', symbols, walk)).toEqual({
      skipChildren: true,
    });
    expect(walk).toHaveBeenCalledWith(fallbackBody, { currentSymbolId: 'symbol:function:fallback' });
  });

  it('returns skipChildren without walking when the resolved function value has no body', () => {
    const valueNode = createNode({
      type: 'arrow_function',
      namedChildren: [],
      childForFieldName: (name: string) => {
        expect(name).toBe('body');
        return null;
      },
    });
    const node = createNode({
      type: 'variable_declarator',
      childForFieldName: (name: string) => {
        expect(name).toBe('value');
        return valueNode;
      },
      namedChildren: [createNode({ type: 'identifier' }), valueNode],
    });
    const symbol = { id: 'symbol:function:nobody' };
    const walk = vi.fn();
    vi.mocked(getVariableAssignedFunctionSymbol).mockReturnValue(symbol as never);

    expect(handleJavaScriptVariableDeclarator(node as never, '/workspace/app.ts', [], walk)).toEqual({
      skipChildren: true,
    });
    expect(walk).not.toHaveBeenCalled();
  });

  it('returns skipChildren without walking when the declarator symbol exists but no value node is present', () => {
    const symbol = { id: 'symbol:function:missing-value' };
    const walk = vi.fn();
    vi.mocked(getVariableAssignedFunctionSymbol).mockReturnValue(symbol as never);

    expect(
      handleJavaScriptVariableDeclarator(
        createNode({
          type: 'variable_declarator',
          childForFieldName: (name: string) => {
            expect(name).toBe('value');
            return null;
          },
          namedChildren: [createNode({ type: 'identifier' })],
        }) as never,
        '/workspace/app.ts',
        [],
        walk,
      ),
    ).toEqual({ skipChildren: true });
    expect(walk).not.toHaveBeenCalled();
  });

  it('skips variable declarators that do not resolve to a function symbol', () => {
    vi.mocked(getVariableAssignedFunctionSymbol).mockReturnValue(null);
    const symbols: never[] = [];

    expect(
      handleJavaScriptVariableDeclarator(createNode({ type: 'variable_declarator' }) as never, '/workspace/app.ts', symbols, vi.fn()),
    ).toBeUndefined();
    expect(symbols).toEqual([]);
  });
});
