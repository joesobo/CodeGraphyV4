import type { IGraphNodeTypeDefinition } from '../../src/graphControls/contracts';

const GODOT_SOURCE = 'codegraphy.gdscript';
const UNITY_SOURCE = 'codegraphy.unity';

export const GODOT_NODE_TYPES = [
  {
    id: 'plugin:codegraphy.gdscript:symbol:godot-class-name',
    label: 'Godot class_name',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolPluginKind: 'godot-class-name',
    matchSymbolSource: GODOT_SOURCE,
  },
  {
    id: 'plugin:codegraphy.gdscript:symbol:exported-property',
    label: 'Exported Property',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolPluginKind: 'exported-property',
    matchSymbolSource: GODOT_SOURCE,
  },
  ...['scene', 'resource', 'autoload', 'scene-node', 'signal'].map((kind) => ({
    id: `plugin:codegraphy.gdscript:symbol:${kind}`,
    label: kind,
    defaultVisible: false,
    parentId: 'symbol',
    matchSymbolPluginKind: kind,
    matchSymbolSource: GODOT_SOURCE,
  })),
] satisfies IGraphNodeTypeDefinition[];

export const UNITY_NODE_TYPES = [
  {
    id: 'plugin:codegraphy.unity:symbol',
    label: 'Unity',
    defaultVisible: false,
    matchSymbolSource: UNITY_SOURCE,
  },
  {
    id: 'plugin:codegraphy.unity:symbol:game-object',
    label: 'GameObject',
    defaultVisible: false,
    parentId: 'plugin:codegraphy.unity:symbol',
    matchSymbolPluginKind: 'game-object',
    matchSymbolSource: UNITY_SOURCE,
  },
  {
    id: 'plugin:codegraphy.unity:symbol:component',
    label: 'Component',
    defaultVisible: false,
    parentId: 'plugin:codegraphy.unity:symbol',
    matchSymbolPluginKind: 'component',
    matchSymbolSource: UNITY_SOURCE,
  },
] satisfies IGraphNodeTypeDefinition[];

export const ENGINE_PLUGIN_NODE_TYPES: IGraphNodeTypeDefinition[] = [
  ...GODOT_NODE_TYPES,
  ...UNITY_NODE_TYPES,
];
