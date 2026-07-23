import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../src/graph/contracts';
import { applyGraphScope } from '../../src/visibleGraph/scope';
import { UNITY_NODE_TYPES } from '../fixtures/enginePluginNodeTypes';

function node(id: string, nodeType?: IGraphNode['nodeType'], symbol?: IGraphNode['symbol']): IGraphNode {
  return {
    id,
    label: id,
    ...(nodeType ? { nodeType } : {}),
    ...(symbol ? { symbol } : {}),
  };
}

function edge(from: string, to: string, kind: IGraphEdge['kind']): IGraphEdge {
  return {
    id: `${from}->${to}#${kind}`,
    from,
    to,
    kind,
    sources: [],
  };
}


function symbol(overrides: Partial<NonNullable<IGraphNode['symbol']>>): NonNullable<IGraphNode['symbol']> {
  return {
    id: 'src/app.ts:symbol:App',
    name: 'App',
    kind: 'class',
    filePath: 'src/app.ts',
    ...overrides,
  };
}






describe('visibleGraph/scope', () => {

  it('removes duplicate file edges when an equivalent symbol relation edge is visible', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/runner.cpp'),
        node('src/base.hpp'),
        node('src/runner.cpp#Runner:class', 'symbol', symbol({
          id: 'src/runner.cpp:class:Runner',
          filePath: 'src/runner.cpp',
          kind: 'class',
          name: 'Runner',
        })),
        node('src/base.hpp#Base:class', 'symbol', symbol({
          id: 'src/base.hpp:class:Base',
          filePath: 'src/base.hpp',
          kind: 'class',
          name: 'Base',
        })),
      ],
      edges: [
        edge('src/runner.cpp', 'src/base.hpp', 'inherit'),
        edge('src/runner.cpp', 'src/base.hpp#Base:class', 'inherit'),
        edge('src/runner.cpp#Runner:class', 'src/base.hpp#Base:class', 'inherit'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: true },
        { type: 'symbol:class', enabled: true },
      ],
      edges: [
        { type: 'inherit', enabled: true },
      ],
    })).toEqual({
      nodes: graphData.nodes,
      edges: [
        edge('src/runner.cpp#Runner:class', 'src/base.hpp#Base:class', 'inherit'),
      ],
    });
  });

  it('keeps Unity file to GameObject containment when Component symbols are visible', () => {
    const graphData: IGraphData = {
      nodes: [
        node('Assets/Prefabs/Enemy1.prefab', 'file'),
        node('Assets/Prefabs/Enemy1.prefab#Enemy1:game-object', 'symbol', symbol({
          id: 'Assets/Prefabs/Enemy1.prefab#Enemy1:game-object',
          filePath: 'Assets/Prefabs/Enemy1.prefab',
          kind: 'game-object',
          name: 'Enemy1',
          pluginKind: 'game-object',
          source: 'codegraphy.unity',
          language: 'unity',
        })),
        node('Assets/Prefabs/Enemy1.prefab#EnemyMovement:component', 'symbol', symbol({
          id: 'Assets/Prefabs/Enemy1.prefab#EnemyMovement:component',
          filePath: 'Assets/Prefabs/Enemy1.prefab',
          kind: 'component',
          name: 'EnemyMovement',
          pluginKind: 'component',
          source: 'codegraphy.unity',
          language: 'unity',
        })),
      ],
      edges: [
        edge('Assets/Prefabs/Enemy1.prefab', 'Assets/Prefabs/Enemy1.prefab#Enemy1:game-object', 'contains'),
        edge('Assets/Prefabs/Enemy1.prefab#Enemy1:game-object', 'Assets/Prefabs/Enemy1.prefab#EnemyMovement:component', 'contains'),
      ],
    };

    const result = applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: true },
        { type: 'plugin:codegraphy.unity:symbol', enabled: true },
        { type: 'plugin:codegraphy.unity:symbol:game-object', enabled: true },
        { type: 'plugin:codegraphy.unity:symbol:component', enabled: true },
      ],
      edges: [{ type: 'contains', enabled: true }],
      nodeTypes: UNITY_NODE_TYPES,
    });

    expect(result.edges.map((item) => item.id)).toEqual([
      'Assets/Prefabs/Enemy1.prefab->Assets/Prefabs/Enemy1.prefab#Enemy1:game-object#contains',
      'Assets/Prefabs/Enemy1.prefab#Enemy1:game-object->Assets/Prefabs/Enemy1.prefab#EnemyMovement:component#contains',
    ]);
  });

  it('projects hidden symbol endpoints back to visible containing files', () => {
    const graphData: IGraphData = {
      nodes: [
        node('scripts/spawning/enemy_spawner.gd'),
        node('resources/enemy_spawn_config.tres'),
        node('resources/enemy_spawn_config.tres#EnemySpawnConfig:resource', 'symbol', symbol({
          id: 'resources/enemy_spawn_config.tres#EnemySpawnConfig:resource',
          name: 'EnemySpawnConfig',
          kind: 'resource',
          filePath: 'resources/enemy_spawn_config.tres',
          pluginKind: 'resource',
          source: 'codegraphy.gdscript',
        })),
      ],
      edges: [{
        id: 'scripts/spawning/enemy_spawner.gd->resources/enemy_spawn_config.tres#EnemySpawnConfig:resource#load:static',
        from: 'scripts/spawning/enemy_spawner.gd',
        to: 'resources/enemy_spawn_config.tres#EnemySpawnConfig:resource',
        kind: 'load',
        sources: [],
      }],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: false },
        { type: 'plugin:codegraphy.gdscript:symbol:resource', enabled: false },
      ],
      edges: [
        { type: 'load', enabled: true },
      ],
    })).toEqual({
      nodes: [
        node('scripts/spawning/enemy_spawner.gd'),
        node('resources/enemy_spawn_config.tres'),
      ],
      edges: [{
        id: 'scripts/spawning/enemy_spawner.gd->resources/enemy_spawn_config.tres#load:static',
        from: 'scripts/spawning/enemy_spawner.gd',
        to: 'resources/enemy_spawn_config.tres',
        kind: 'load',
        sources: [],
      }],
    });
  });
});
