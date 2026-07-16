import { describe, expect, it } from 'vitest';
import { buildWorkspaceGraphDataFromAnalysis } from '../../../../src/graph/data';
import { createPlugin, UNITY_NODE_VISIBILITY } from '../fixture';

describe('core/graph/data Unity symbol containment', () => {
  it('keeps core file-level edges when Unity symbol rows are visible but core symbols are hidden', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'Assets/Scripts/Enemy/EnemyHealth.cs': { size: 20 },
        'Assets/Scripts/Health.cs': { size: 20 },
        'Assets/Prefabs/Enemy1.prefab': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['Assets/Scripts/Enemy/EnemyHealth.cs', {
          filePath: '/workspace/Assets/Scripts/Enemy/EnemyHealth.cs',
          symbols: [{
            id: '/workspace/Assets/Scripts/Enemy/EnemyHealth.cs:class:EnemyHealth',
            filePath: '/workspace/Assets/Scripts/Enemy/EnemyHealth.cs',
            kind: 'class',
            name: 'EnemyHealth',
          }],
          relations: [{
            kind: 'inherit',
            sourceId: 'core:treesitter:inherit',
            fromFilePath: '/workspace/Assets/Scripts/Enemy/EnemyHealth.cs',
            fromSymbolId: '/workspace/Assets/Scripts/Enemy/EnemyHealth.cs:class:EnemyHealth',
            toFilePath: '/workspace/Assets/Scripts/Health.cs',
            specifier: 'Health',
            resolvedPath: '/workspace/Assets/Scripts/Health.cs',
          }],
        }],
        ['Assets/Scripts/Health.cs', {
          filePath: '/workspace/Assets/Scripts/Health.cs',
          symbols: [{
            id: '/workspace/Assets/Scripts/Health.cs:class:Health',
            filePath: '/workspace/Assets/Scripts/Health.cs',
            kind: 'class',
            name: 'Health',
          }],
          relations: [],
        }],
        ['Assets/Prefabs/Enemy1.prefab', {
          filePath: '/workspace/Assets/Prefabs/Enemy1.prefab',
          symbols: [{
            id: 'Assets/Prefabs/Enemy1.prefab#unity:game-object:1000',
            filePath: '/workspace/Assets/Prefabs/Enemy1.prefab',
            kind: 'game-object',
            name: 'Enemy 1',
            metadata: {
              source: 'codegraphy.unity',
              language: 'unity',
              pluginKind: 'game-object',
            },
          }],
          relations: [{
            kind: 'contains',
            pluginId: 'codegraphy.unity',
            sourceId: 'unity-containment',
            fromFilePath: '/workspace/Assets/Prefabs/Enemy1.prefab',
            toSymbolId: 'Assets/Prefabs/Enemy1.prefab#unity:game-object:1000',
          }],
        }],
      ]),
      showOrphans: true,
      nodeVisibility: UNITY_NODE_VISIBILITY,
      workspaceRoot: '/workspace',
      getPluginForFile: (filePath) => (
        filePath.endsWith('.prefab')
          ? createPlugin('codegraphy.unity')
          : createPlugin('codegraphy.csharp')
      ),
    });

    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'Assets/Scripts/Enemy/EnemyHealth.cs->Assets/Scripts/Health.cs#inherit',
        from: 'Assets/Scripts/Enemy/EnemyHealth.cs',
        to: 'Assets/Scripts/Health.cs',
        kind: 'inherit',
      }),
      expect.objectContaining({
        id: 'Assets/Prefabs/Enemy1.prefab->Assets/Prefabs/Enemy1.prefab#Enemy 1:game-object#contains',
        from: 'Assets/Prefabs/Enemy1.prefab',
        to: 'Assets/Prefabs/Enemy1.prefab#Enemy 1:game-object',
        kind: 'contains',
      }),
    ]));
  });


  it('does not project same-file symbol containment as a file self-edge when symbols are disabled', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'Assets/Prefabs/Player.prefab': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['Assets/Prefabs/Player.prefab', {
          filePath: '/workspace/Assets/Prefabs/Player.prefab',
          symbols: [{
            id: 'Assets/Prefabs/Player.prefab#unity:game-object:1000',
            filePath: '/workspace/Assets/Prefabs/Player.prefab',
            kind: 'game-object',
            name: 'Player',
            metadata: {
              source: 'codegraphy.unity',
              language: 'unity',
              pluginKind: 'game-object',
            },
          }],
          relations: [{
            kind: 'contains',
            pluginId: 'codegraphy.unity',
            sourceId: 'unity-containment',
            fromFilePath: '/workspace/Assets/Prefabs/Player.prefab',
            toFilePath: '/workspace/Assets/Prefabs/Player.prefab',
            toSymbolId: 'Assets/Prefabs/Player.prefab#unity:game-object:1000',
          }],
        }],
      ]),
      showOrphans: true,
      nodeVisibility: { symbol: false },
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.unity'),
    });

    expect(graph.edges).toEqual([]);
  });


  it('does not project Unity file-to-symbol containment without target paths as file self-edges', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'Assets/Prefabs/Enemy1.prefab': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['Assets/Prefabs/Enemy1.prefab', {
          filePath: '/workspace/Assets/Prefabs/Enemy1.prefab',
          symbols: [{
            id: 'Assets/Prefabs/Enemy1.prefab#unity:game-object:1000',
            filePath: '/workspace/Assets/Prefabs/Enemy1.prefab',
            kind: 'game-object',
            name: 'Enemy 1',
            metadata: {
              source: 'codegraphy.unity',
              language: 'unity',
              pluginKind: 'game-object',
            },
          }],
          relations: [{
            kind: 'contains',
            pluginId: 'codegraphy.unity',
            sourceId: 'unity-containment',
            fromFilePath: '/workspace/Assets/Prefabs/Enemy1.prefab',
            toSymbolId: 'Assets/Prefabs/Enemy1.prefab#unity:game-object:1000',
          }],
        }],
      ]),
      showOrphans: true,
      nodeVisibility: { symbol: false },
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.unity'),
    });

    expect(graph.edges).toEqual([]);
  });


  it('keeps Unity component containment routed through GameObjects when Components are visible', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'Assets/Prefabs/Player.prefab': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['Assets/Prefabs/Player.prefab', {
          filePath: '/workspace/Assets/Prefabs/Player.prefab',
          symbols: [
            {
              id: 'Assets/Prefabs/Player.prefab#unity:game-object:1000',
              filePath: '/workspace/Assets/Prefabs/Player.prefab',
              kind: 'game-object',
              name: 'Player',
              metadata: {
                source: 'codegraphy.unity',
                language: 'unity',
                pluginKind: 'game-object',
              },
            },
            {
              id: 'Assets/Prefabs/Player.prefab#unity:component:1001',
              filePath: '/workspace/Assets/Prefabs/Player.prefab',
              kind: 'component',
              name: 'Transform',
              metadata: {
                source: 'codegraphy.unity',
                language: 'unity',
                pluginKind: 'component',
              },
            },
          ],
          relations: [
            {
              kind: 'contains',
              pluginId: 'codegraphy.unity',
              sourceId: 'unity-containment',
              fromFilePath: '/workspace/Assets/Prefabs/Player.prefab',
              toFilePath: '/workspace/Assets/Prefabs/Player.prefab',
              toSymbolId: 'Assets/Prefabs/Player.prefab#unity:game-object:1000',
            },
            {
              kind: 'contains',
              pluginId: 'codegraphy.unity',
              sourceId: 'unity-containment',
              fromFilePath: '/workspace/Assets/Prefabs/Player.prefab',
              toFilePath: '/workspace/Assets/Prefabs/Player.prefab',
              fromSymbolId: 'Assets/Prefabs/Player.prefab#unity:game-object:1000',
              toSymbolId: 'Assets/Prefabs/Player.prefab#unity:component:1001',
            },
          ],
        }],
      ]),
      showOrphans: true,
      nodeVisibility: UNITY_NODE_VISIBILITY,
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.unity'),
    });

    expect(graph.edges.map((edge) => edge.id)).toEqual([
      'Assets/Prefabs/Player.prefab->Assets/Prefabs/Player.prefab#Player:game-object#contains',
      'Assets/Prefabs/Player.prefab#Player:game-object->Assets/Prefabs/Player.prefab#Transform:component#contains',
    ]);
  });

});
