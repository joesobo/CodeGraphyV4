import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR } from '../../../../../src/shared/fileColors';
import {
  applyNodeLegendRules,
  compileNodeLegendRules,
  getOrderedActiveRules,
} from '../../../../../src/webview/search/filtering/rules/nodes';
import { buildGraphViewMergedGroups } from '../../../../../src/extension/graphView/groups/merged';

describe('search/filtering/rules/nodes', () => {
  it('returns a reversed copy of enabled rules without mutating the source list', () => {
    const legends = [
      { id: 'first', pattern: 'src/**', color: '#111111' },
      { id: 'disabled', pattern: 'src/**', color: '#222222', disabled: true },
      { id: 'last', pattern: 'src/App.ts', color: '#333333' },
    ];

    expect(getOrderedActiveRules(legends).map((rule) => rule.id)).toEqual(['last', 'first']);
    expect(legends.map((rule) => rule.id)).toEqual(['first', 'disabled', 'last']);
  });

  it('precomputes whether compiled rules have scoped constraints', () => {
    const compiledRules = compileNodeLegendRules([
      { id: 'plain', pattern: 'src/**', color: '#111111' },
      {
        id: 'scoped',
        pattern: '**',
        color: '#222222',
        matchNodeType: 'symbol',
      },
    ]);

    expect(compiledRules.map((rule) => [rule.rule.id, rule.hasConstraints])).toEqual([
      ['plain', false],
      ['scoped', true],
    ]);
  });

  it('drops disabled rules and applies active rules from bottom to top', () => {
    const activeRules = getOrderedActiveRules([
      { id: 'specific', pattern: 'src/App.ts', color: '#00ff00', imageUrl: 'icon.png' },
      { id: 'disabled', pattern: 'src/**', color: '#999999', disabled: true },
      { id: 'typescript', pattern: 'src/**', color: '#ff0000', shape2D: 'diamond', shape3D: 'cube' },
    ]);

    expect(activeRules.map((rule) => rule.id)).toEqual(['typescript', 'specific']);
    expect(applyNodeLegendRules(
      { id: 'src/App.ts', label: 'App', color: '#111111' },
      activeRules,
    )).toMatchObject({
      color: '#00ff00',
      shape2D: 'diamond',
      shape3D: 'cube',
      imageUrl: 'icon.png',
    });
  });

  it('falls back to the default node color when the source node has no color', () => {
    expect(applyNodeLegendRules(
      { id: 'src/util.ts', label: 'utility', color: '' },
      [],
    ).color).toBe(DEFAULT_NODE_COLOR);
  });

  it('ignores edge-targeted and non-matching rules while treating missing targets as node rules', () => {
    expect(
      applyNodeLegendRules(
        { id: 'src/App.ts', label: 'App', color: '#111111' },
        [
          { id: 'edge', pattern: 'src/App.ts', color: '#ff0000', target: 'edge' },
          { id: 'miss', pattern: 'src/Other.ts', color: '#00ff00', imageUrl: 'miss.png' },
          { id: 'default-node', pattern: 'src/App.ts', color: '#123456' },
        ],
      ),
    ).toEqual({
      id: 'src/App.ts',
      label: 'App',
      color: '#123456',
    });
  });

  it('applies both-targeted rules to nodes and preserves existing image urls when later rules do not provide one', () => {
    expect(
      applyNodeLegendRules(
        { id: 'src/App.ts', label: 'App', color: '#111111' },
        [
          { id: 'shared', pattern: 'src/App.ts', color: '#abcdef', target: 'both', imageUrl: 'shared.png' },
          { id: 'override', pattern: 'src/App.ts', color: '#fedcba' },
        ],
      ),
    ).toEqual({
      id: 'src/App.ts',
      label: 'App',
      color: '#fedcba',
      imageUrl: 'shared.png',
    });
  });

  it('lets plugin defaults override core defaults while custom rules still win last', () => {
    const activeRules = getOrderedActiveRules(
      buildGraphViewMergedGroups(
        [
          { id: 'user:custom', pattern: '*.ts', color: '#ff00ff', imageUrl: 'custom.png' },
        ],
        [
          { id: 'default:fileExtension:ts', pattern: '*.ts', color: '#0288d1', imageUrl: 'core.png' },
        ],
        [
          { id: 'plugin:codegraphy.typescript:*.ts', pattern: '*.ts', color: '#ff0000' },
        ],
      ),
    );

    expect(
      applyNodeLegendRules(
        { id: 'src/app.ts', label: 'app.ts', color: '#111111' },
        activeRules,
      ),
    ).toEqual({
      id: 'src/app.ts',
      label: 'app.ts',
      color: '#ff00ff',
      imageUrl: 'custom.png',
    });
  });

  it('applies generic folder rules only to folder nodes while allowing specific folder rules to override them', () => {
    const activeRules = getOrderedActiveRules([
      {
        id: 'default:folderName:src',
        pattern: 'src',
        color: '#778899',
        imageUrl: 'src-folder.png',
      },
      {
        id: 'default:folder',
        pattern: '**',
        color: '#445566',
        imageUrl: 'folder.png',
        matchNodeType: 'folder',
      },
    ]);

    expect(
      applyNodeLegendRules(
        { id: 'docs', label: 'docs', color: '#111111', nodeType: 'folder' },
        activeRules,
      ),
    ).toEqual({
      id: 'docs',
      label: 'docs',
      color: '#445566',
      nodeType: 'folder',
      imageUrl: 'folder.png',
    });

    expect(
      applyNodeLegendRules(
        { id: 'src', label: 'src', color: '#111111', nodeType: 'folder' },
        activeRules,
      ),
    ).toEqual({
      id: 'src',
      label: 'src',
      color: '#778899',
      nodeType: 'folder',
      imageUrl: 'src-folder.png',
    });

    expect(
      applyNodeLegendRules(
        { id: 'src/app.ts', label: 'app.ts', color: '#111111', nodeType: 'file' },
        activeRules,
      ),
    ).toEqual({
      id: 'src/app.ts',
      label: 'app.ts',
      color: '#111111',
      nodeType: 'file',
    });
  });

  it('matches path-based custom rules against symbol containing file paths', () => {
    const activeRules = getOrderedActiveRules([
      { id: 'core', pattern: 'packages/core/**', color: '#00ff00' },
    ]);

    expect(
      applyNodeLegendRules(
        {
          id: 'symbol:function:parseGraph',
          label: 'parseGraph',
          color: '#111111',
          nodeType: 'symbol',
          symbol: {
            id: 'symbol:function:parseGraph',
            name: 'parseGraph',
            kind: 'function',
            filePath: 'packages/core/src/graph/parser.ts',
          },
        },
        activeRules,
      ),
    ).toMatchObject({
      color: '#00ff00',
    });
  });

  it('applies scoped symbol rules by kind, plugin kind, source, language, and containing file', () => {
    const activeRules = getOrderedActiveRules([
      {
        id: 'symbol:function',
        pattern: '**',
        color: '#8B5CF6',
        matchNodeType: 'symbol',
        matchSymbolKind: 'function',
      },
      {
        id: 'symbol:godot-class-name',
        pattern: '**',
        color: '#478CBF',
        matchNodeType: 'symbol',
        matchSymbolKind: 'class',
        matchSymbolPluginKind: 'godot-class-name',
        matchSymbolSource: 'codegraphy.gdscript',
        matchSymbolLanguage: 'gdscript',
        matchSymbolFilePath: 'scripts/**/*.gd',
      },
    ]);

    expect(
      applyNodeLegendRules(
        {
          id: 'scripts/player.gd#Player:class',
          label: 'Player',
          color: '#111111',
          nodeType: 'symbol',
          symbol: {
            id: 'scripts/player.gd#Player:class',
            name: 'Player',
            kind: 'class',
            filePath: 'scripts/player.gd',
            source: 'codegraphy.gdscript',
            language: 'gdscript',
            pluginKind: 'godot-class-name',
          },
        },
        activeRules,
      ),
    ).toMatchObject({
      color: '#478CBF',
    });

    expect(
      applyNodeLegendRules(
        {
          id: 'scripts/player.gd#ready:function',
          label: 'ready',
          color: '#111111',
          nodeType: 'symbol',
          symbol: {
            id: 'scripts/player.gd#ready:function',
            name: 'ready',
            kind: 'function',
            filePath: 'scripts/player.gd',
          },
        },
        activeRules,
      ),
    ).toMatchObject({
      color: '#8B5CF6',
    });
  });
});
