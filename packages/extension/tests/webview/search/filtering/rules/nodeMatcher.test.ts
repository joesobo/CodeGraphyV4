import { describe, expect, it } from 'vitest';
import { ruleMatchesNode, ruleTargetsNodes } from '../../../../../src/webview/search/filtering/rules/nodeMatcher';

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

describe('search/filtering/rules/nodeMatcher', () => {
  it('targets nodes for missing node targets and both targets but not edge targets', () => {
    expect(ruleTargetsNodes({ id: 'node', pattern: '**', color: '#111111' })).toBe(true);
    expect(ruleTargetsNodes({ id: 'both', pattern: '**', color: '#111111', target: 'both' })).toBe(true);
    expect(ruleTargetsNodes({ id: 'edge', pattern: '**', color: '#111111', target: 'edge' })).toBe(false);
  });

  it('matches every scoped symbol field and the symbol file glob', () => {
    expect(ruleMatchesNode(symbolNode, {
      id: 'godot-class',
      pattern: '**',
      color: '#478CBF',
      matchNodeType: 'symbol',
      matchSymbolKind: 'class',
      matchSymbolPluginKind: 'godot-class-name',
      matchSymbolSource: 'codegraphy.gdscript',
      matchSymbolLanguage: 'gdscript',
      matchSymbolFilePath: 'scripts/**/*.gd',
    })).toBe(true);
  });

  it('rejects each scoped symbol field independently', () => {
    expect(ruleMatchesNode(symbolNode, {
      id: 'node-type',
      pattern: '**',
      color: '#111111',
      matchNodeType: 'file',
    })).toBe(false);
    expect(ruleMatchesNode(symbolNode, {
      id: 'kind',
      pattern: '**',
      color: '#111111',
      matchSymbolKind: 'function',
    })).toBe(false);
    expect(ruleMatchesNode(symbolNode, {
      id: 'plugin-kind',
      pattern: '**',
      color: '#111111',
      matchSymbolPluginKind: 'method',
    })).toBe(false);
    expect(ruleMatchesNode(symbolNode, {
      id: 'source',
      pattern: '**',
      color: '#111111',
      matchSymbolSource: 'other.plugin',
    })).toBe(false);
    expect(ruleMatchesNode(symbolNode, {
      id: 'language',
      pattern: '**',
      color: '#111111',
      matchSymbolLanguage: 'typescript',
    })).toBe(false);
    expect(ruleMatchesNode(symbolNode, {
      id: 'file-path',
      pattern: '**',
      color: '#111111',
      matchSymbolFilePath: 'addons/**/*.gd',
    })).toBe(false);
  });

  it('requires a symbol file path when a symbol file glob is configured', () => {
    expect(ruleMatchesNode({
      id: 'src/app.ts',
      label: 'app.ts',
      color: '#111111',
      nodeType: 'file' as const,
    }, {
      id: 'symbol-path',
      pattern: '**',
      color: '#111111',
      matchSymbolFilePath: 'src/**/*.ts',
    })).toBe(false);
  });
});
