import { describe, expect, it } from 'vitest';
import { analyzeUnitySerializedFile } from '../src/analysis';

const playerControllerGuid = '11111111111111111111111111111111';
const playerPrefabGuid = '22222222222222222222222222222222';

function prefabFixture(): string {
  return [
    '%YAML 1.1',
    '%TAG !u! tag:unity3d.com,2011:',
    '--- !u!1 &1000',
    'GameObject:',
    '  m_Name: Player',
    '--- !u!4 &1001',
    'Transform:',
    '  m_GameObject: {fileID: 1000}',
    '--- !u!50 &1002',
    'Rigidbody2D:',
    '  m_GameObject: {fileID: 1000}',
    '--- !u!114 &1003',
    'MonoBehaviour:',
    '  m_GameObject: {fileID: 1000}',
    `  m_Script: {fileID: 11500000, guid: ${playerControllerGuid}, type: 3}`,
    '--- !u!1 &2000',
    'GameObject:',
    '  m_Name: Camera Rig',
    '--- !u!20 &2001',
    'Camera:',
    '  m_GameObject: {fileID: 2000}',
    '',
  ].join('\n');
}

describe('analyzeUnitySerializedFile', () => {
  it('emits GameObject and Component symbols from Unity YAML', () => {
    const analysis = analyzeUnitySerializedFile(
      '/workspace/Assets/Prefabs/Player.prefab',
      prefabFixture(),
      {
        workspaceRoot: '/workspace',
        resolveGuid: (guid) => {
          if (guid === playerControllerGuid) {
            return 'Assets/Scripts/Player/PlayerController.cs';
          }
          return undefined;
        },
      },
    );

    expect(analysis.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'Assets/Prefabs/Player.prefab#unity:game-object:1000',
        kind: 'game-object',
        name: 'Player',
        metadata: expect.objectContaining({
          pluginKind: 'game-object',
          fileId: '1000',
        }),
      }),
      expect.objectContaining({
        id: 'Assets/Prefabs/Player.prefab#unity:component:1003',
        kind: 'component',
        name: 'PlayerController',
        metadata: expect.objectContaining({
          pluginKind: 'component',
          unityClass: 'MonoBehaviour',
          gameObjectFileId: '1000',
          scriptGuid: playerControllerGuid,
          scriptPath: 'Assets/Scripts/Player/PlayerController.cs',
        }),
      }),
      expect.objectContaining({
        id: 'Assets/Prefabs/Player.prefab#unity:component:2001',
        kind: 'component',
        name: 'Camera',
      }),
    ]));
  });

  it('connects files, GameObjects, Components, and resolved scripts', () => {
    const analysis = analyzeUnitySerializedFile(
      '/workspace/Assets/Prefabs/Player.prefab',
      prefabFixture(),
      {
        workspaceRoot: '/workspace',
        resolveGuid: () => 'Assets/Scripts/Player/PlayerController.cs',
      },
    );

    expect(analysis.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'contains',
        sourceId: 'unity-containment',
        fromFilePath: '/workspace/Assets/Prefabs/Player.prefab',
        toFilePath: '/workspace/Assets/Prefabs/Player.prefab',
        toSymbolId: 'Assets/Prefabs/Player.prefab#unity:game-object:1000',
      }),
      expect.objectContaining({
        kind: 'contains',
        sourceId: 'unity-containment',
        fromSymbolId: 'Assets/Prefabs/Player.prefab#unity:game-object:1000',
        toSymbolId: 'Assets/Prefabs/Player.prefab#unity:component:1003',
      }),
      expect.objectContaining({
        kind: 'reference',
        sourceId: 'script-guid',
        fromSymbolId: 'Assets/Prefabs/Player.prefab#unity:component:1003',
        toFilePath: '/workspace/Assets/Scripts/Player/PlayerController.cs',
        resolvedPath: '/workspace/Assets/Scripts/Player/PlayerController.cs',
      }),
      expect.objectContaining({
        kind: 'reference',
        sourceId: 'script-guid',
        fromFilePath: '/workspace/Assets/Prefabs/Player.prefab',
        toFilePath: '/workspace/Assets/Scripts/Player/PlayerController.cs',
        resolvedPath: '/workspace/Assets/Scripts/Player/PlayerController.cs',
      }),
    ]));
  });

  it('connects scenes to referenced prefab assets', () => {
    const analysis = analyzeUnitySerializedFile(
      '/workspace/Assets/Scenes/SampleScene.unity',
      [
        '--- !u!1 &42',
        'GameObject:',
        '  m_Name: Player Instance',
        '--- !u!1001 &9000',
        'PrefabInstance:',
        `  m_SourcePrefab: {fileID: 100100000, guid: ${playerPrefabGuid}, type: 3}`,
      ].join('\n'),
      {
        workspaceRoot: '/workspace',
        resolveGuid: (guid) => {
          if (guid === playerPrefabGuid) {
            return 'Assets/Prefabs/Player.prefab';
          }
          return undefined;
        },
      },
    );

    expect(analysis.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'reference',
        sourceId: 'prefab-guid',
        fromFilePath: '/workspace/Assets/Scenes/SampleScene.unity',
        toFilePath: '/workspace/Assets/Prefabs/Player.prefab',
        specifier: 'Assets/Prefabs/Player.prefab',
        resolvedPath: '/workspace/Assets/Prefabs/Player.prefab',
      }),
    ]));
  });

  it('connects ScriptableObject assets to their script and serialized asset references', () => {
    const enemyDefinitionGuid = '33333333333333333333333333333333';
    const analysis = analyzeUnitySerializedFile(
      '/workspace/Assets/ScriptableObjects/Enemy1.asset',
      [
        '--- !u!114 &11400000',
        'MonoBehaviour:',
        `  m_Script: {fileID: 11500000, guid: ${enemyDefinitionGuid}, type: 3}`,
        '  m_Name: Enemy1',
        `  prefab: {fileID: 6200000000000000001, guid: ${playerPrefabGuid}, type: 3}`,
      ].join('\n'),
      {
        workspaceRoot: '/workspace',
        resolveGuid: (guid) => {
          if (guid === enemyDefinitionGuid) {
            return 'Assets/Scripts/Enemy/EnemyDefinition.cs';
          }
          if (guid === playerPrefabGuid) {
            return 'Assets/Prefabs/Enemy1.prefab';
          }
          return undefined;
        },
      },
    );

    expect(analysis.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'reference',
        sourceId: 'script-guid',
        fromFilePath: '/workspace/Assets/ScriptableObjects/Enemy1.asset',
        toFilePath: '/workspace/Assets/Scripts/Enemy/EnemyDefinition.cs',
      }),
      expect.objectContaining({
        kind: 'reference',
        sourceId: 'serialized-guid',
        fromFilePath: '/workspace/Assets/ScriptableObjects/Enemy1.asset',
        toFilePath: '/workspace/Assets/Prefabs/Enemy1.prefab',
        specifier: 'Assets/Prefabs/Enemy1.prefab',
        resolvedPath: '/workspace/Assets/Prefabs/Enemy1.prefab',
      }),
    ]));
  });

  it('uses .unity files as containers without adding duplicate scene symbols', () => {
    const analysis = analyzeUnitySerializedFile(
      '/workspace/Assets/Scenes/SampleScene.unity',
      ['--- !u!1 &42', 'GameObject:', '  m_Name: Spawner'].join('\n'),
      { workspaceRoot: '/workspace' },
    );

    expect(analysis.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'Assets/Scenes/SampleScene.unity#unity:game-object:42',
        kind: 'game-object',
        name: 'Spawner',
      }),
    ]));
    expect(analysis.symbols).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'scene',
      }),
    ]));
  });
});
