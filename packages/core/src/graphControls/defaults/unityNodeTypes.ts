import type { IGraphNodeTypeDefinition } from '../contracts';

export function createUnityNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
    {
      id: 'plugin:codegraphy.unity:symbol',
      label: 'Unity',
      defaultColor: '#F97316',
      defaultVisible: false,
      pluginName: 'Unity',
      matchSymbolSource: 'codegraphy.unity',
      matchSymbolLanguage: 'unity',
    },
    {
      id: 'plugin:codegraphy.unity:symbol:scene',
      label: 'Scene',
      defaultColor: '#F97316',
      defaultVisible: false,
      parentId: 'plugin:codegraphy.unity:symbol',
      pluginName: 'Unity',
      matchSymbolKinds: ['scene'],
      matchSymbolPluginKind: 'scene',
      matchSymbolSource: 'codegraphy.unity',
      matchSymbolLanguage: 'unity',
      matchSymbolFilePath: '**/*.unity',
    },
    {
      id: 'plugin:codegraphy.unity:symbol:prefab',
      label: 'Prefab',
      defaultColor: '#8B5CF6',
      defaultVisible: false,
      parentId: 'plugin:codegraphy.unity:symbol',
      pluginName: 'Unity',
      matchSymbolKinds: ['prefab'],
      matchSymbolPluginKind: 'prefab',
      matchSymbolSource: 'codegraphy.unity',
      matchSymbolLanguage: 'unity',
      matchSymbolFilePath: '**/*.prefab',
    },
    {
      id: 'plugin:codegraphy.unity:symbol:game-object',
      label: 'GameObject',
      defaultColor: '#0EA5E9',
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
      defaultColor: '#22C55E',
      defaultVisible: false,
      parentId: 'plugin:codegraphy.unity:symbol',
      pluginName: 'Unity',
      matchSymbolKinds: ['component'],
      matchSymbolPluginKind: 'component',
      matchSymbolSource: 'codegraphy.unity',
      matchSymbolLanguage: 'unity',
    },
  ];
}

export const UNITY_NODE_TYPES: IGraphNodeTypeDefinition[] = createUnityNodeTypes();
