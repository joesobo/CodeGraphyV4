import { describe, expect, it } from 'vitest';
import type { IGroup } from '../../../../../src/shared/settings/groups';
import { ruleConstraintsMatchNode } from '../../../../../src/webview/search/filtering/rules/nodeConstraints';

const symbolNode = {
  id: 'scripts/player.gd#Player:class',
  label: 'Player',
  color: '#111111',
  nodeType: 'symbol' as const,
  symbol: {
    id: 'scripts/player.gd#Player:class',
    filePath: 'scripts/player.gd',
    name: 'Player',
    kind: 'class',
    pluginKind: 'godot-class-name',
    source: 'codegraphy.gdscript',
    language: 'gdscript',
  },
};

describe('search/filtering/rules/nodeConstraints', () => {
  it('matches every configured exact symbol constraint', () => {
    expect(ruleConstraintsMatchNode(symbolNode, {
      id: 'godot-class',
      pattern: '**',
      color: '#478CBF',
      matchNodeType: 'symbol',
      matchSymbolKind: 'class',
      matchSymbolPluginKind: 'godot-class-name',
      matchSymbolSource: 'codegraphy.gdscript',
      matchSymbolLanguage: 'gdscript',
    })).toBe(true);
  });

  it('matches any configured symbol kind in a symbol-kind list', () => {
    expect(ruleConstraintsMatchNode(symbolNode, {
      id: 'kind-list',
      pattern: '**',
      color: '#8B5CF6',
      matchSymbolKinds: ['function', 'class'],
    })).toBe(true);
  });

  it('requires symbol metadata when a symbol-kind list is configured', () => {
    expect(ruleConstraintsMatchNode({
      id: 'scripts/player.gd',
      label: 'player.gd',
      color: '#111111',
      nodeType: 'file',
    }, {
      id: 'kind-list',
      pattern: '**',
      color: '#8B5CF6',
      matchSymbolKinds: ['class'],
    })).toBe(false);
  });

  it('matches symbol file paths with a glob', () => {
    expect(ruleConstraintsMatchNode(symbolNode, {
      id: 'file-path',
      pattern: '**',
      color: '#8B5CF6',
      matchSymbolFilePath: 'scripts/**/*.gd',
    })).toBe(true);
  });

  it('rejects mismatched constraints independently', () => {
    const rules: Array<Partial<IGroup>> = [
      { matchNodeType: 'file' },
      { matchSymbolKind: 'function' },
      { matchSymbolPluginKind: 'method' },
      { matchSymbolSource: 'other.plugin' },
      { matchSymbolLanguage: 'typescript' },
      { matchSymbolKinds: ['function', 'method'] },
      { matchSymbolFilePath: 'addons/**/*.gd' },
    ];

    for (const rule of rules) {
      expect(ruleConstraintsMatchNode(symbolNode, {
        id: JSON.stringify(rule),
        pattern: '**',
        color: '#111111',
        ...rule,
      })).toBe(false);
    }
  });
});
