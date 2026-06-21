import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { CORE_SYMBOL_GROUPS } from '../../../../../../src/extension/graphView/groups/defaults/symbols/core';
import { CALLABLE_SYMBOL_GROUPS } from '../../../../../../src/extension/graphView/groups/defaults/symbols/core/callables';
import { TYPE_LIKE_SYMBOL_GROUPS } from '../../../../../../src/extension/graphView/groups/defaults/symbols/core/typeLike';
import { VARIABLE_SYMBOL_GROUPS } from '../../../../../../src/extension/graphView/groups/defaults/symbols/core/variables';
import { createMaterialSymbolIconDataUrl } from '../../../../../../src/extension/graphView/groups/defaults/symbols/icons';
import { PLUGIN_SYMBOL_GROUPS } from '../../../../../../src/extension/graphView/groups/defaults/symbols/plugins';

describe('graphView/default symbol group catalog', () => {
  it('defines the core symbol groups in display order', () => {
    expect(CALLABLE_SYMBOL_GROUPS.map(withoutImageUrl)).toEqual([
      {
        id: 'default:symbol-kind:function',
        displayLabel: 'Function',
        color: '#8B5CF6',
        matchNodeType: 'symbol',
        matchSymbolKind: 'function',
      },
      {
        id: 'default:symbol-kind:method',
        displayLabel: 'Method',
        color: '#A855F7',
        matchNodeType: 'symbol',
        matchSymbolKind: 'method',
      },
      {
        id: 'default:symbol-kind:constructor',
        displayLabel: 'Constructor',
        color: '#C084FC',
        matchNodeType: 'symbol',
        matchSymbolKind: 'constructor',
      },
    ]);
    expect(TYPE_LIKE_SYMBOL_GROUPS.map(withoutImageUrl)).toEqual([
      {
        id: 'default:symbol-kind:prototype',
        displayLabel: 'Prototype',
        color: '#A78BFA',
        matchNodeType: 'symbol',
        matchSymbolKind: 'prototype',
      },
      {
        id: 'default:symbol-kind:class',
        displayLabel: 'Class',
        color: '#3B82F6',
        matchNodeType: 'symbol',
        matchSymbolKind: 'class',
      },
      {
        id: 'default:symbol-kind:interface',
        displayLabel: 'Interface',
        color: '#06B6D4',
        matchNodeType: 'symbol',
        matchSymbolKind: 'interface',
      },
      {
        id: 'default:symbol-kind:record',
        displayLabel: 'Record',
        color: '#6366F1',
        matchNodeType: 'symbol',
        matchSymbolKind: 'record',
      },
      {
        id: 'default:symbol-kind:delegate',
        displayLabel: 'Delegate',
        color: '#10B981',
        matchNodeType: 'symbol',
        matchSymbolKind: 'delegate',
      },
      {
        id: 'default:symbol-kind:type',
        displayLabel: 'Type',
        color: '#EC4899',
        matchNodeType: 'symbol',
        matchSymbolKind: 'type',
      },
      {
        id: 'default:symbol-kind:struct',
        displayLabel: 'Struct',
        color: '#0EA5E9',
        matchNodeType: 'symbol',
        matchSymbolKind: 'struct',
      },
      {
        id: 'default:symbol-kind:union',
        displayLabel: 'Union',
        color: '#14B8A6',
        matchNodeType: 'symbol',
        matchSymbolKind: 'union',
      },
      {
        id: 'default:symbol-kind:enum',
        displayLabel: 'Enum',
        color: '#F59E0B',
        matchNodeType: 'symbol',
        matchSymbolKind: 'enum',
      },
      {
        id: 'default:symbol-kind:typedef',
        displayLabel: 'Typedef',
        color: '#F472B6',
        matchNodeType: 'symbol',
        matchSymbolKind: 'typedef',
      },
      {
        id: 'default:symbol-kind:alias',
        displayLabel: 'Alias',
        color: '#F472B6',
        matchNodeType: 'symbol',
        matchSymbolKind: 'alias',
      },
      {
        id: 'default:symbol-kind:template',
        displayLabel: 'Template',
        color: '#C084FC',
        matchNodeType: 'symbol',
        matchSymbolKind: 'template',
      },
      {
        id: 'default:symbol-kind:property',
        displayLabel: 'Property',
        color: '#84CC16',
        matchNodeType: 'symbol',
        matchSymbolKind: 'property',
      },
      {
        id: 'default:symbol-kind:event',
        displayLabel: 'Event',
        color: '#F97316',
        matchNodeType: 'symbol',
        matchSymbolKind: 'event',
      },
    ]);
    expect(VARIABLE_SYMBOL_GROUPS.map(withoutImageUrl)).toEqual([
      {
        id: 'default:symbol-kind:variable',
        displayLabel: 'Variable',
        color: '#14B8A6',
        matchNodeType: 'variable',
        matchSymbolKind: 'variable',
      },
      {
        id: 'default:symbol-kind:constant',
        displayLabel: 'Constant',
        color: '#22C55E',
        matchNodeType: 'variable',
        matchSymbolKind: 'constant',
      },
      {
        id: 'default:symbol-kind:field',
        displayLabel: 'Field',
        color: '#84CC16',
        matchNodeType: 'variable',
        matchSymbolKind: 'field',
      },
      {
        id: 'default:symbol-kind:parameter',
        displayLabel: 'Parameter',
        color: '#2DD4BF',
        matchNodeType: 'variable',
        matchSymbolKind: 'parameter',
      },
      {
        id: 'default:symbol-kind:local',
        displayLabel: 'Local',
        color: '#10B981',
        matchNodeType: 'variable',
        matchSymbolKind: 'local',
      },
      {
        id: 'default:symbol-kind:global',
        displayLabel: 'Global',
        color: '#0D9488',
        matchNodeType: 'variable',
        matchSymbolKind: 'global',
      },
    ]);
    expect(CORE_SYMBOL_GROUPS).toEqual([
      ...CALLABLE_SYMBOL_GROUPS,
      ...TYPE_LIKE_SYMBOL_GROUPS,
      ...VARIABLE_SYMBOL_GROUPS,
    ]);
  });

  it('defines plugin-specific symbol groups with plugin ownership metadata', () => {
    expect(PLUGIN_SYMBOL_GROUPS.map(withoutImageUrl)).toEqual([
      {
        id: 'plugin:codegraphy.gdscript:symbol:godot-class-name',
        displayLabel: 'class_name',
        color: '#478CBF',
        matchNodeType: 'symbol',
        matchSymbolKind: 'class',
        matchSymbolPluginKind: 'godot-class-name',
        matchSymbolSource: 'codegraphy.gdscript',
        matchSymbolLanguage: 'gdscript',
        matchSymbolFilePath: '**/*.gd',
        pluginId: 'codegraphy.gdscript',
        pluginName: 'Godot',
      },
    ]);
  });

  it('creates white material symbol svg data urls', () => {
    const imageUrl = createMaterialSymbolIconDataUrl('M1 1h2v2H1z');

    expect(decodeSvgDataUrl(imageUrl)).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#FFFFFF" d="M1 1h2v2H1z"/></svg>');
  });
});

function withoutImageUrl<T extends { imageUrl?: string }>(group: T): Omit<T, 'imageUrl'> {
  const rest = { ...group };
  delete rest.imageUrl;
  return rest;
}

function decodeSvgDataUrl(imageUrl: string): string {
  const [, encodedSvg] = imageUrl.split(',');
  return Buffer.from(encodedSvg, 'base64').toString('utf8');
}
