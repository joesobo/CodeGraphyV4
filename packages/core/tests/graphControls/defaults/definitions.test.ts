import { describe, expect, it } from 'vitest';
import { CORE_GRAPH_NODE_TYPES } from '../../../src/graphControls/defaults/definitions';
import { createCoreSymbolNodeTypes } from '../../../src/graphControls/defaults/symbolNodeTypes';
import { createCoreVariableNodeTypes } from '../../../src/graphControls/defaults/variableNodeTypes';

describe('graphControls/defaults/definitions', () => {
  it('keeps symbol and variable node types disabled by default', () => {
    const visibilityByType = Object.fromEntries(
      CORE_GRAPH_NODE_TYPES.map((definition) => [definition.id, definition.defaultVisible]),
    );

    expect(visibilityByType).toMatchObject({
      symbol: false,
      'symbol:function': false,
      'symbol:class': false,
      'symbol:interface': false,
      'symbol:record': false,
      'symbol:delegate': false,
      'symbol:constructor': false,
      'symbol:property': false,
      'symbol:event': false,
      'symbol:type': false,
      'symbol:struct': false,
      'symbol:enum': false,
      'plugin:codegraphy.gdscript:symbol:scene': false,
      'plugin:codegraphy.gdscript:symbol:resource': false,
      'plugin:codegraphy.gdscript:symbol:autoload': false,
      'plugin:codegraphy.gdscript:symbol:scene-node': false,
      'plugin:codegraphy.gdscript:symbol:signal': false,
      variable: false,
      'symbol:constant': false,
      'plugin:codegraphy.gdscript:symbol:godot-class-name': false,
      'plugin:codegraphy.gdscript:symbol:exported-property': false,
    });

    expect(CORE_GRAPH_NODE_TYPES.find((definition) => definition.id === 'variable')?.parentId)
      .toBe('symbol');
  });

  it('declares concrete core symbol node type definitions', () => {
    expect(createCoreSymbolNodeTypes()).toEqual([
      { id: 'symbol', label: 'Symbol', defaultColor: '#7C3AED', defaultVisible: false },
      { id: 'symbol:function', label: 'Function', defaultColor: '#8B5CF6', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['function', 'method'] },
      { id: 'symbol:namespace', label: 'Namespace', defaultColor: '#64748B', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['namespace'] },
      { id: 'symbol:callable', label: 'Callable', defaultColor: '#8B5CF6', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['function'] },
      { id: 'symbol:method', label: 'Method', defaultColor: '#A855F7', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['method'] },
      { id: 'symbol:constructor', label: 'Constructor', defaultColor: '#C084FC', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['constructor'] },
      { id: 'symbol:prototype', label: 'Prototype', defaultColor: '#A78BFA', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['prototype'] },
      { id: 'symbol:class', label: 'Class', defaultColor: '#3B82F6', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['class'] },
      { id: 'symbol:interface', label: 'Interface', defaultColor: '#06B6D4', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['interface'] },
      { id: 'symbol:record', label: 'Record', defaultColor: '#6366F1', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['record'] },
      { id: 'symbol:delegate', label: 'Delegate', defaultColor: '#10B981', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['delegate'] },
      { id: 'symbol:property', label: 'Property', defaultColor: '#84CC16', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['property'] },
      { id: 'symbol:event', label: 'Event', defaultColor: '#F97316', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['event'] },
      { id: 'symbol:type', label: 'Type', defaultColor: '#EC4899', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['type'] },
      { id: 'symbol:struct', label: 'Struct', defaultColor: '#0EA5E9', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['struct'] },
      { id: 'symbol:union', label: 'Union', defaultColor: '#14B8A6', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['union'] },
      { id: 'symbol:enum', label: 'Enum', defaultColor: '#F59E0B', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['enum'] },
      { id: 'symbol:typedef', label: 'Typedef', defaultColor: '#F472B6', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['typedef'] },
      { id: 'symbol:alias', label: 'Alias', defaultColor: '#F472B6', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['alias'] },
      { id: 'symbol:template', label: 'Template', defaultColor: '#C084FC', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['template'] },
      {
        id: 'plugin:codegraphy.gdscript:symbol:scene',
        label: 'Scene',
        defaultColor: '#478CBF',
        defaultVisible: false,
        parentId: 'symbol',
        pluginName: 'Godot',
        matchSymbolKinds: ['scene'],
        matchSymbolPluginKind: 'scene',
        matchSymbolSource: 'codegraphy.gdscript',
      },
      {
        id: 'plugin:codegraphy.gdscript:symbol:resource',
        label: 'Resource',
        defaultColor: '#F59E0B',
        defaultVisible: false,
        parentId: 'symbol',
        pluginName: 'Godot',
        matchSymbolKinds: ['resource'],
        matchSymbolPluginKind: 'resource',
        matchSymbolSource: 'codegraphy.gdscript',
      },
      {
        id: 'plugin:codegraphy.gdscript:symbol:autoload',
        label: 'Autoload',
        defaultColor: '#10B981',
        defaultVisible: false,
        parentId: 'symbol',
        pluginName: 'Godot',
        matchSymbolKinds: ['autoload'],
        matchSymbolPluginKind: 'autoload',
        matchSymbolSource: 'codegraphy.gdscript',
      },
      {
        id: 'plugin:codegraphy.gdscript:symbol:scene-node',
        label: 'Scene Node',
        defaultColor: '#A855F7',
        defaultVisible: false,
        parentId: 'symbol',
        pluginName: 'Godot',
        matchSymbolKinds: ['scene-node'],
        matchSymbolPluginKind: 'scene-node',
        matchSymbolSource: 'codegraphy.gdscript',
      },
      {
        id: 'plugin:codegraphy.gdscript:symbol:signal',
        label: 'Signal',
        defaultColor: '#EF4444',
        defaultVisible: false,
        parentId: 'symbol',
        pluginName: 'Godot',
        matchSymbolKinds: ['signal'],
        matchSymbolPluginKind: 'signal',
        matchSymbolSource: 'codegraphy.gdscript',
      },
    ]);
  });

  it('declares concrete core variable node type definitions', () => {
    expect(createCoreVariableNodeTypes()).toEqual([
      { id: 'variable', label: 'Variable', defaultColor: '#14B8A6', defaultVisible: false, parentId: 'symbol' },
      { id: 'variable:plain', label: 'Plain Variable', defaultColor: '#14B8A6', defaultVisible: false, parentId: 'variable', matchSymbolKinds: ['variable'] },
      { id: 'symbol:constant', label: 'Constant', defaultColor: '#22C55E', defaultVisible: false, parentId: 'variable', matchSymbolKinds: ['constant'] },
      { id: 'symbol:global', label: 'Global', defaultColor: '#0D9488', defaultVisible: false, parentId: 'variable', matchSymbolKinds: ['global'] },
      { id: 'symbol:field', label: 'Field', defaultColor: '#84CC16', defaultVisible: false, parentId: 'variable', matchSymbolKinds: ['field'] },
      { id: 'symbol:parameter', label: 'Parameter', defaultColor: '#2DD4BF', defaultVisible: false, parentId: 'variable', matchSymbolKinds: ['parameter'] },
      { id: 'symbol:local', label: 'Local', defaultColor: '#10B981', defaultVisible: false, parentId: 'variable', matchSymbolKinds: ['local'] },
      {
        id: 'plugin:codegraphy.gdscript:symbol:godot-class-name',
        label: 'Godot class_name',
        defaultColor: '#478CBF',
        defaultVisible: false,
        parentId: 'variable',
        pluginName: 'Godot',
        matchSymbolKinds: ['class'],
        matchSymbolPluginKind: 'godot-class-name',
        matchSymbolSource: 'codegraphy.gdscript',
        matchSymbolLanguage: 'gdscript',
        matchSymbolFilePath: '**/*.gd',
      },
      {
        id: 'plugin:codegraphy.gdscript:symbol:exported-property',
        label: 'Exported Property',
        defaultColor: '#2DD4BF',
        defaultVisible: false,
        parentId: 'variable',
        pluginName: 'Godot',
        matchSymbolKinds: ['variable'],
        matchSymbolPluginKind: 'exported-property',
        matchSymbolSource: 'codegraphy.gdscript',
        matchSymbolLanguage: 'gdscript',
        matchSymbolFilePath: '**/*.gd',
      },
    ]);
  });
});
