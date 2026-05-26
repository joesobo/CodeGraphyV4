import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../src/graph/contracts';
import type { IGraphNodeTypeDefinition } from '../../src/graphControls/contracts';
import { symbolMatchesScopedDefinition } from '../../src/visibleGraph/scopeSymbolMatch';

function symbolNode(symbol: IGraphNode['symbol']): IGraphNode {
  return {
    id: 'symbol:User',
    label: 'User',
    color: '#111111',
    nodeType: 'symbol',
    symbol,
  };
}

function definition(overrides: Partial<IGraphNodeTypeDefinition> = {}): IGraphNodeTypeDefinition {
  return {
    id: 'symbol',
    label: 'Symbol',
    defaultColor: '#111111',
    defaultVisible: true,
    ...overrides,
  };
}

const userSymbol: IGraphNode['symbol'] = {
  id: 'symbol:User',
  name: 'User',
  kind: 'class',
  pluginKind: 'class_declaration',
  source: 'tree-sitter',
  language: 'typescript',
  filePath: 'src/user.ts',
};

describe('visibleGraph/scopeSymbolMatch', () => {
  it('matches symbols when optional scoped fields are omitted', () => {
    expect(symbolMatchesScopedDefinition(symbolNode(userSymbol), definition())).toBe(true);
    expect(symbolMatchesScopedDefinition(symbolNode(userSymbol), definition({
      matchSymbolKinds: ['class'],
    }))).toBe(true);
  });

  it('rejects mismatched optional scoped fields independently', () => {
    expect(symbolMatchesScopedDefinition(symbolNode(userSymbol), definition({
      matchSymbolPluginKind: 'function_declaration',
    }))).toBe(false);
    expect(symbolMatchesScopedDefinition(symbolNode(userSymbol), definition({
      matchSymbolSource: 'codegraphy.gdscript',
    }))).toBe(false);
    expect(symbolMatchesScopedDefinition(symbolNode(userSymbol), definition({
      matchSymbolLanguage: 'gdscript',
    }))).toBe(false);
    expect(symbolMatchesScopedDefinition(symbolNode(userSymbol), definition({
      matchSymbolFilePath: 'game/**/*.gd',
    }))).toBe(false);
  });
});
