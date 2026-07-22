import type { IGraphNodeTypeDefinition } from '../contracts';

export function createUnityNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
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
  ];
}

export const UNITY_NODE_TYPES: IGraphNodeTypeDefinition[] = createUnityNodeTypes();
