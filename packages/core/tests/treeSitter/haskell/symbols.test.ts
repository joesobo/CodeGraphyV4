import type Parser from 'tree-sitter';
import { describe, expect, it } from 'vitest';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import {
  handleHaskellDeclaration,
  handleHaskellHeader,
} from '../../../src/treeSitter/runtime/analyzeHaskell/symbols';

function createNode({
  type,
  text = type,
  fields = {},
}: {
  type: string;
  text?: string;
  fields?: Record<string, Parser.SyntaxNode | null | undefined>;
}): Parser.SyntaxNode {
  return {
    type,
    text,
    namedChildren: [],
    startPosition: { row: 0, column: 0 },
    endPosition: { row: 0, column: text.length },
    childForFieldName(name: string) {
      return fields[name] ?? null;
    },
  } as unknown as Parser.SyntaxNode;
}

function createNamedDeclaration(type: string, name: string): Parser.SyntaxNode {
  return createNode({
    type,
    fields: {
      name: createNode({ type: 'variable', text: name }),
    },
  });
}

describe('pipeline/plugins/treesitter/runtime/analyzeHaskell/symbols', () => {
  it('adds module symbols from Haskell module headers', () => {
    const symbols: IAnalysisSymbol[] = [];

    handleHaskellHeader(
      createNode({
        type: 'module',
        fields: {
          module: createNode({ type: 'module_name', text: 'App.Feature' }),
        },
      }),
      '/workspace/App/Feature.hs',
      symbols,
    );
    handleHaskellHeader(createNode({ type: 'module' }), '/workspace/App/Feature.hs', symbols);

    expect(symbols).toEqual([
      expect.objectContaining({
        id: '/workspace/App/Feature.hs:module:App.Feature',
        kind: 'module',
        name: 'App.Feature',
      }),
    ]);
  });

  it('adds generic symbols for Haskell data, newtype, type, and function declarations', () => {
    const symbols: IAnalysisSymbol[] = [];

    const dataAction = handleHaskellDeclaration(
      createNamedDeclaration('data_type', 'Runner'),
      '/workspace/App.hs',
      symbols,
    );
    const newtypeAction = handleHaskellDeclaration(
      createNamedDeclaration('newtype', 'RunnerId'),
      '/workspace/App.hs',
      symbols,
    );
    const typeAction = handleHaskellDeclaration(
      createNamedDeclaration('type_synonym', 'RunnerName'),
      '/workspace/App.hs',
      symbols,
    );
    const functionAction = handleHaskellDeclaration(
      createNamedDeclaration('function', 'boot'),
      '/workspace/App.hs',
      symbols,
    );

    expect(dataAction).toBeUndefined();
    expect(newtypeAction).toEqual({ skipChildren: true });
    expect(typeAction).toEqual({ skipChildren: true });
    expect(functionAction).toBeUndefined();
    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'type', name: 'Runner' }),
      expect.objectContaining({ kind: 'type', name: 'RunnerId' }),
      expect.objectContaining({ kind: 'type', name: 'RunnerName' }),
      expect.objectContaining({ kind: 'function', name: 'boot' }),
    ]);
  });

  it('adds class symbols without skipping children', () => {
    const symbols: IAnalysisSymbol[] = [];

    const action = handleHaskellDeclaration(
      createNamedDeclaration('class', 'Runnable'),
      '/workspace/App.hs',
      symbols,
    );

    expect(action).toBeUndefined();
    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'class', name: 'Runnable' }),
    ]);
  });

  it('ignores unsupported and unnamed declarations', () => {
    const symbols: IAnalysisSymbol[] = [];

    expect(handleHaskellDeclaration(createNode({ type: 'signature' }), '/workspace/App.hs', symbols)).toBeUndefined();
    expect(handleHaskellDeclaration(createNode({ type: 'data_type' }), '/workspace/App.hs', symbols)).toBeUndefined();
    expect(handleHaskellDeclaration(createNode({ type: 'class' }), '/workspace/App.hs', symbols)).toBeUndefined();

    expect(symbols).toEqual([]);
  });
});
