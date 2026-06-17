import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { GDScriptPathResolver } from '../../src/PathResolver';
import { registerGodotFileMetadata } from '../../src/plugin/metadata';
import { GodotSignalConnectionIndex } from '../../src/plugin/signalConnections';
import type { GodotWorkspaceFile } from '../../src/plugin/types';

const WORKSPACE_ROOT = '/workspace/game';

function workspaceFile(relativePath: string, content: string): GodotWorkspaceFile {
  return {
    absolutePath: path.join(WORKSPACE_ROOT, relativePath),
    relativePath,
    content,
  };
}

function createResolver(files: readonly GodotWorkspaceFile[]): GDScriptPathResolver {
  const resolver = new GDScriptPathResolver(WORKSPACE_ROOT);
  for (const file of files) {
    registerGodotFileMetadata(resolver, file.relativePath, file.content);
  }

  return resolver;
}

describe('GodotSignalConnectionIndex', () => {
  it('indexes typed, inferred, and local signal connections by source file', () => {
    const files = [
      workspaceFile('scripts/components/health_component.gd', [
        'class_name HealthComponent',
        'signal died',
      ].join('\n')),
      workspaceFile('scripts/base/entity.gd', [
        'class_name Entity',
        'var _health_component: HealthComponent',
        'func _ready() -> void:',
        '\t_health_component.died.connect(_on_health_depleted)',
      ].join('\n')),
      workspaceFile('scripts/spawning/enemy_spawner.gd', [
        'class_name EnemySpawner',
        'signal enemy_spawned(enemy: Enemy)',
      ].join('\n')),
      workspaceFile('scripts/main.gd', [
        'class_name Main',
        '@onready var _enemy_spawner: Node = %EnemySpawner',
        'func _ready() -> void:',
        '\t_enemy_spawner.enemy_spawned.connect(_wire_enemy)',
      ].join('\n')),
      workspaceFile('scripts/projectile.gd', [
        'class_name Projectile',
        'func _ready() -> void:',
        '\tbody_entered.connect(_on_body_entered)',
      ].join('\n')),
    ];
    const resolver = createResolver(files);
    const index = new GodotSignalConnectionIndex();

    index.replaceWorkspaceFiles(files, WORKSPACE_ROOT, resolver);

    expect(index.getRelations('scripts/components/health_component.gd').map(relation => ({
      fromFilePath: path.relative(WORKSPACE_ROOT, relation.fromFilePath),
      fromSymbolId: relation.fromSymbolId,
      toFilePath: relation.toFilePath ? path.relative(WORKSPACE_ROOT, relation.toFilePath) : null,
    }))).toEqual([
      {
        fromFilePath: 'scripts/components/health_component.gd',
        fromSymbolId: 'scripts/components/health_component.gd#died:signal',
        toFilePath: 'scripts/base/entity.gd',
      },
    ]);
    expect(index.getRelations('scripts/spawning/enemy_spawner.gd').map(relation => ({
      fromFilePath: path.relative(WORKSPACE_ROOT, relation.fromFilePath),
      fromSymbolId: relation.fromSymbolId,
      toFilePath: relation.toFilePath ? path.relative(WORKSPACE_ROOT, relation.toFilePath) : null,
    }))).toEqual([
      {
        fromFilePath: 'scripts/spawning/enemy_spawner.gd',
        fromSymbolId: 'scripts/spawning/enemy_spawner.gd#enemy_spawned:signal',
        toFilePath: 'scripts/main.gd',
      },
    ]);
    expect(index.getRelations('scripts/projectile.gd').map(relation => ({
      fromFilePath: path.relative(WORKSPACE_ROOT, relation.fromFilePath),
      fromSymbolId: relation.fromSymbolId,
      toFilePath: relation.toFilePath ? path.relative(WORKSPACE_ROOT, relation.toFilePath) : null,
    }))).toEqual([
      {
        fromFilePath: 'scripts/projectile.gd',
        fromSymbolId: undefined,
        toFilePath: 'scripts/projectile.gd',
      },
    ]);
  });
});
