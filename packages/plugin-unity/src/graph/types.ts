import type { IPluginNodeType } from '@codegraphy-dev/plugin-api';

export function createUnityNodeTypes(): IPluginNodeType[] {
  return [
    {
      id: 'plugin:codegraphy.unity:symbol',
      label: 'Unity',
      defaultVisible: false,
      matchSymbolSource: 'codegraphy.unity',
      matchSymbolLanguage: 'unity',
      description: {
        description: 'Unity-specific GameObject and Component structure emitted by the Unity plugin.',
      },
    },
    {
      id: 'plugin:codegraphy.unity:symbol:game-object',
      label: 'GameObject',
      defaultVisible: false,
      parentId: 'plugin:codegraphy.unity:symbol',
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
      defaultVisible: false,
      parentId: 'plugin:codegraphy.unity:symbol',
      matchSymbolKinds: ['component'],
      matchSymbolPluginKind: 'component',
      matchSymbolSource: 'codegraphy.unity',
      matchSymbolLanguage: 'unity',
      description: {
        description: 'Unity Components attached to GameObjects, including MonoBehaviours resolved through script GUIDs.',
        examples: [{
          label: 'Unity YAML',
          code: 'MonoBehaviour:\n  m_GameObject: {fileID: 1000}',
        }],
      },
    },
  ];
}
