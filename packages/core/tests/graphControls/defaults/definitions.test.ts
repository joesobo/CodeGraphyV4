import { describe, expect, it } from 'vitest';
import { CORE_GRAPH_NODE_TYPES } from '../../../src/graphControls/defaults/definitions';
import { createCoreSymbolNodeTypes } from '../../../src/graphControls/defaults/symbolNodeTypes';
import { createUnityNodeTypes } from '../../../src/graphControls/defaults/unityNodeTypes';
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
      'symbol:mixin': false,
      'symbol:extension': false,
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
      'plugin:codegraphy.unity:symbol': false,
      'plugin:codegraphy.unity:symbol:game-object': false,
      'plugin:codegraphy.unity:symbol:component': false,
      'plugin:codegraphy.gdscript:symbol:exported-property': false,
    });

    expect(CORE_GRAPH_NODE_TYPES.find((definition) => definition.id === 'variable')?.parentId)
      .toBe('symbol');
  });

  it('declares concrete core symbol node type definitions', () => {
    expect(createCoreSymbolNodeTypes()).toEqual([
      { id: 'symbol', label: 'Symbol', defaultVisible: false },
      { id: 'symbol:function', label: 'Function', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['function', 'method'] },
      { id: 'symbol:namespace', label: 'Namespace', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['namespace'] },
      { id: 'symbol:callable', label: 'Callable', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['function'] },
      { id: 'symbol:method', label: 'Method', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['method'] },
      { id: 'symbol:constructor', label: 'Constructor', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['constructor'] },
      { id: 'symbol:prototype', label: 'Prototype', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['prototype'] },
      { id: 'symbol:class', label: 'Class', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['class'] },
      { id: 'symbol:mixin', label: 'Mixin', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['mixin'] },
      { id: 'symbol:extension', label: 'Extension', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['extension'] },
      { id: 'symbol:interface', label: 'Interface', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['interface'] },
      { id: 'symbol:record', label: 'Record', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['record'] },
      { id: 'symbol:delegate', label: 'Delegate', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['delegate'] },
      { id: 'symbol:property', label: 'Property', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['property'] },
      { id: 'symbol:event', label: 'Event', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['event'] },
      { id: 'symbol:type', label: 'Type', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['type'] },
      { id: 'symbol:struct', label: 'Struct', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['struct'] },
      { id: 'symbol:union', label: 'Union', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['union'] },
      { id: 'symbol:enum', label: 'Enum', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['enum'] },
      { id: 'symbol:typedef', label: 'Typedef', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['typedef'] },
      { id: 'symbol:alias', label: 'Alias', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['alias'] },
      { id: 'symbol:template', label: 'Template', defaultVisible: false, parentId: 'symbol', matchSymbolKinds: ['template'] },
      {
        id: 'plugin:codegraphy.gdscript:symbol:scene',
        label: 'Scene',
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
      { id: 'variable', label: 'Variable', defaultVisible: false, parentId: 'symbol' },
      { id: 'variable:plain', label: 'Plain Variable', defaultVisible: false, parentId: 'variable', matchSymbolKinds: ['variable'] },
      { id: 'symbol:constant', label: 'Constant', defaultVisible: false, parentId: 'variable', matchSymbolKinds: ['constant'] },
      { id: 'symbol:global', label: 'Global', defaultVisible: false, parentId: 'variable', matchSymbolKinds: ['global'] },
      { id: 'symbol:field', label: 'Field', defaultVisible: false, parentId: 'variable', matchSymbolKinds: ['field'] },
      { id: 'symbol:parameter', label: 'Parameter', defaultVisible: false, parentId: 'variable', matchSymbolKinds: ['parameter'] },
      { id: 'symbol:local', label: 'Local', defaultVisible: false, parentId: 'variable', matchSymbolKinds: ['local'] },
      {
        id: 'plugin:codegraphy.gdscript:symbol:godot-class-name',
        label: 'Godot class_name',
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

  it('declares concrete Unity node type definitions', () => {
    expect(createUnityNodeTypes()).toEqual([
      {
        id: 'plugin:codegraphy.unity:symbol',
        label: 'Unity',
        defaultVisible: false,
        pluginName: 'Unity',
        matchSymbolSource: 'codegraphy.unity',
        matchSymbolLanguage: 'unity',
      },
      {
        id: 'plugin:codegraphy.unity:symbol:game-object',
        label: 'GameObject',
        defaultVisible: false,
        parentId: 'plugin:codegraphy.unity:symbol',
        pluginName: 'Unity',
        matchSymbolKinds: ['game-object'],
        matchSymbolPluginKind: 'game-object',
        matchSymbolSource: 'codegraphy.unity',
        matchSymbolLanguage: 'unity',
      },
      {
        id: 'plugin:codegraphy.unity:symbol:component',
        label: 'Component',
        defaultVisible: false,
        parentId: 'plugin:codegraphy.unity:symbol',
        pluginName: 'Unity',
        matchSymbolKinds: ['component'],
        matchSymbolPluginKind: 'component',
        matchSymbolSource: 'codegraphy.unity',
        matchSymbolLanguage: 'unity',
      },
    ]);
  });
});
