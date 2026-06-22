import type { IGraphNodeTypeDefinition } from '../../contracts';

export function createUnityGraphNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
    {
      id: 'plugin:codegraphy.unity:symbol',
      label: 'Unity',
      defaultColor: '#F97316',
      defaultVisible: false,
      pluginName: 'Unity',
      matchSymbolSource: 'codegraphy.unity',
      matchSymbolLanguage: 'unity',
      description: {
        description: 'Unity-specific GameObject and Component structure emitted by the Unity plugin.',
      },
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
      description: {
        description: 'Named Unity GameObjects declared inside scenes and prefabs.',
        examples: [{ label: 'Unity YAML', code: 'GameObject:\n  m_Name: EnemySpawner' }],
      },
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
      description: {
        description: 'Unity Components attached to GameObjects, including MonoBehaviours resolved through script GUIDs.',
        examples: [{ label: 'Unity YAML', code: 'MonoBehaviour:\n  m_GameObject: {fileID: 1000}' }],
      },
    },
  ];
}
