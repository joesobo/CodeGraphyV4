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
        description: 'Unity-specific scene and prefab structure emitted by the Unity plugin.',
      },
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
      description: {
        description: 'Unity scene files that define the active GameObjects in a level.',
        examples: [{ label: 'Unity YAML', code: '--- !u!1 &42\nGameObject:\n  m_Name: SampleSceneRoot' }],
      },
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
      description: {
        description: 'Reusable Unity object templates declared in `.prefab` files.',
        examples: [{ label: 'Unity YAML', code: '--- !u!1 &1000\nGameObject:\n  m_Name: Player' }],
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
