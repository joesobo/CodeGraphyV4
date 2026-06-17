import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { getSymbolDefaultGroups } from '../../../../../../src/extension/graphView/groups/defaults/symbols';
import type { IGraphNode } from '../../../../../../src/shared/graph/contracts';

describe('graphView/default symbol groups', () => {
  it('does not create symbol groups when the graph has no symbol metadata', () => {
    expect(getSymbolDefaultGroups({
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', color: '#000000', nodeType: 'file' },
        { id: 'src', label: 'src', color: '#000000', nodeType: 'folder' },
        { id: 'missing-symbol', label: 'missing-symbol', color: '#000000', nodeType: 'symbol' },
      ],
      edges: [],
    })).toEqual([]);
  });

  it('creates one default group for each core symbol kind present in the graph', () => {
    const groups = getSymbolDefaultGroups({
      nodes: [
        symbolNode('function-node', 'function'),
        symbolNode('method-node', 'method'),
        symbolNode('class-node', 'class'),
        symbolNode('interface-node', 'interface'),
        symbolNode('type-node', 'type'),
        symbolNode('struct-node', 'struct'),
        symbolNode('enum-node', 'enum'),
        symbolNode('variable-node', 'variable', { nodeType: 'variable' }),
        symbolNode('constant-node', 'constant', { nodeType: 'variable' }),
      ],
      edges: [],
    });

    expect(groups.map(selectStableGroupFields)).toEqual([
      {
        id: 'default:symbol-kind:function',
        displayLabel: 'Function',
        color: '#8B5CF6',
        pattern: '**',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
        matchNodeType: 'symbol',
        matchSymbolKinds: ['function', 'method'],
      },
      {
        id: 'default:symbol-kind:class',
        displayLabel: 'Class',
        color: '#3B82F6',
        pattern: '**',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
        matchNodeType: 'symbol',
        matchSymbolKind: 'class',
      },
      {
        id: 'default:symbol-kind:interface',
        displayLabel: 'Interface',
        color: '#06B6D4',
        pattern: '**',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
        matchNodeType: 'symbol',
        matchSymbolKind: 'interface',
      },
      {
        id: 'default:symbol-kind:type',
        displayLabel: 'Type',
        color: '#EC4899',
        pattern: '**',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
        matchNodeType: 'symbol',
        matchSymbolKind: 'type',
      },
      {
        id: 'default:symbol-kind:struct',
        displayLabel: 'Struct',
        color: '#0EA5E9',
        pattern: '**',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
        matchNodeType: 'symbol',
        matchSymbolKind: 'struct',
      },
      {
        id: 'default:symbol-kind:enum',
        displayLabel: 'Enum',
        color: '#F59E0B',
        pattern: '**',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
        matchNodeType: 'symbol',
        matchSymbolKind: 'enum',
      },
      {
        id: 'default:symbol-kind:variable',
        displayLabel: 'Variable',
        color: '#14B8A6',
        pattern: '**',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
        matchNodeType: 'variable',
        matchSymbolKind: 'variable',
      },
      {
        id: 'default:symbol-kind:constant',
        displayLabel: 'Constant',
        color: '#22C55E',
        pattern: '**',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
        matchNodeType: 'variable',
        matchSymbolKind: 'constant',
      },
    ]);
    expect(groups.every((group) => group.imageUrl && decodesToMaterialIcon(group.imageUrl))).toBe(true);
  });

  it('keeps variable symbol kinds out of symbol-node groups', () => {
    expect(getSymbolDefaultGroups({
      nodes: [
        symbolNode('variable-symbol-node', 'variable'),
        symbolNode('constant-symbol-node', 'constant'),
      ],
      edges: [],
    })).toEqual([]);
  });

  it('requires the Godot plugin symbol metadata before adding the class_name group', () => {
    const groups = getSymbolDefaultGroups({
      nodes: [
        symbolNode('plugin-kind-mismatch', 'class', {
          pluginKind: 'class',
          source: 'codegraphy.gdscript',
          language: 'gdscript',
          filePath: 'scripts/player.gd',
        }),
        symbolNode('source-mismatch', 'class', {
          pluginKind: 'godot-class-name',
          source: 'codegraphy.typescript',
          language: 'gdscript',
          filePath: 'scripts/player.gd',
        }),
        symbolNode('language-mismatch', 'class', {
          pluginKind: 'godot-class-name',
          source: 'codegraphy.gdscript',
          language: 'typescript',
          filePath: 'scripts/player.gd',
        }),
        symbolNode('file-path-mismatch', 'class', {
          pluginKind: 'godot-class-name',
          source: 'codegraphy.gdscript',
          language: 'gdscript',
          filePath: 'scripts/player.ts',
        }),
      ],
      edges: [],
    });

    expect(groups.map((group) => group.id)).toEqual(['default:symbol-kind:class']);
  });

  it('adds the Godot class_name group when a GDScript class_name symbol is present', () => {
    const groups = getSymbolDefaultGroups({
      nodes: [
        symbolNode('godot-class-name', 'class', {
          pluginKind: 'godot-class-name',
          source: 'codegraphy.gdscript',
          language: 'gdscript',
          filePath: 'scripts/player.gd',
        }),
      ],
      edges: [],
    });

    expect(groups.map(selectStableGroupFields)).toContainEqual({
      id: 'plugin:codegraphy.gdscript:symbol:godot-class-name',
      displayLabel: 'class_name',
      color: '#478CBF',
      pattern: '**',
      isPluginDefault: true,
      pluginId: 'codegraphy.gdscript',
      pluginName: 'Godot',
      matchNodeType: 'symbol',
      matchSymbolKind: 'class',
      matchSymbolPluginKind: 'godot-class-name',
      matchSymbolSource: 'codegraphy.gdscript',
      matchSymbolLanguage: 'gdscript',
      matchSymbolFilePath: '**/*.gd',
    });
  });

  it('adds Godot scene-node and exported-property groups when those symbols are present', () => {
    const groups = getSymbolDefaultGroups({
      nodes: [
        symbolNode('scene-node', 'scene-node', {
          pluginKind: 'scene-node',
          source: 'codegraphy.gdscript',
          language: 'godot-resource',
          filePath: 'scenes/player.tscn',
        }),
        symbolNode('exported-property', 'variable', {
          nodeType: 'variable',
          pluginKind: 'exported-property',
          source: 'codegraphy.gdscript',
          language: 'gdscript',
          filePath: 'scripts/player.gd',
        }),
      ],
      edges: [],
    });

    expect(groups.map(selectStableGroupFields)).toEqual(expect.arrayContaining([
      {
        id: 'plugin:codegraphy.gdscript:symbol:scene-node',
        displayLabel: 'Scene Node',
        color: '#A855F7',
        pattern: '**',
        isPluginDefault: true,
        pluginId: 'codegraphy.gdscript',
        pluginName: 'Godot',
        matchNodeType: 'symbol',
        matchSymbolKind: 'scene-node',
        matchSymbolPluginKind: 'scene-node',
        matchSymbolSource: 'codegraphy.gdscript',
      },
      {
        id: 'plugin:codegraphy.gdscript:symbol:exported-property',
        displayLabel: 'Exported Property',
        color: '#2DD4BF',
        pattern: '**',
        isPluginDefault: true,
        pluginId: 'codegraphy.gdscript',
        pluginName: 'Godot',
        matchNodeType: 'variable',
        matchSymbolKind: 'variable',
        matchSymbolPluginKind: 'exported-property',
        matchSymbolSource: 'codegraphy.gdscript',
        matchSymbolLanguage: 'gdscript',
        matchSymbolFilePath: '**/*.gd',
      },
    ]));
  });
});

function symbolNode(
  id: string,
  kind: string,
  overrides: Partial<IGraphNode['symbol']> & { nodeType?: IGraphNode['nodeType'] } = {},
): IGraphNode {
  const { nodeType = 'symbol', ...symbolOverrides } = overrides;
  return {
    id,
    label: id,
    color: '#000000',
    nodeType,
    symbol: {
      id,
      name: id,
      kind,
      filePath: `${id}.ts`,
      ...symbolOverrides,
    },
  };
}

function selectStableGroupFields(group: ReturnType<typeof getSymbolDefaultGroups>[number]) {
  const {
    color,
    displayLabel,
    id,
    isPluginDefault,
    matchNodeType,
    matchSymbolFilePath,
    matchSymbolKind,
    matchSymbolKinds,
    matchSymbolLanguage,
    matchSymbolPluginKind,
    matchSymbolSource,
    pattern,
    pluginId,
    pluginName,
  } = group;

  return removeUndefinedValues({
    color,
    displayLabel,
    id,
    isPluginDefault,
    matchNodeType,
    matchSymbolFilePath,
    matchSymbolKind,
    matchSymbolKinds,
    matchSymbolLanguage,
    matchSymbolPluginKind,
    matchSymbolSource,
    pattern,
    pluginId,
    pluginName,
  });
}

function removeUndefinedValues<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as Partial<T>;
}

function decodesToMaterialIcon(imageUrl: string): boolean {
  const [, encodedSvg] = imageUrl.split(',');
  if (!encodedSvg) {
    return false;
  }
  const svg = Buffer.from(encodedSvg, 'base64').toString('utf8');
  return svg.includes('<path fill="#FFFFFF" d="') && !svg.includes('d=""/>');
}
