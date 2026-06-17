import { describe, expect, it } from 'vitest';
import { extractTextResourceSymbols } from '../../../src/plugin/symbol/textResourceSymbols';

describe('extractTextResourceSymbols', () => {
  it('extracts scene and scene-node symbols from text scenes', () => {
    const symbols = extractTextResourceSymbols([
      '[gd_scene load_steps=3 format=3]',
      '[ext_resource type="Script" path="res://scripts/player.gd" id="1_script"]',
      '[node name="Player" type="CharacterBody2D"]',
      'script = ExtResource("1_script")',
      '[node name="HealthComponent" type="Node" parent="."]',
    ].join('\n'), '/workspace/game/scenes/player.tscn', 'scenes/player.tscn');

    expect(symbols.map(symbol => ({
      filePath: symbol.filePath,
      id: symbol.id,
      kind: symbol.kind,
      metadata: symbol.metadata,
      name: symbol.name,
      range: symbol.range,
    }))).toEqual([
      {
        id: 'scenes/player.tscn#Player:scene:3',
        name: 'Player',
        kind: 'scene',
        filePath: '/workspace/game/scenes/player.tscn',
        range: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
        },
        metadata: {
          language: 'godot-resource',
          pluginKind: 'scene',
          source: 'codegraphy.gdscript',
        },
      },
      {
        id: 'scenes/player.tscn#Player:scene-node:3',
        name: 'Player',
        kind: 'scene-node',
        filePath: '/workspace/game/scenes/player.tscn',
        range: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
        },
        metadata: {
          language: 'godot-resource',
          pluginKind: 'scene-node',
          source: 'codegraphy.gdscript',
        },
      },
      {
        id: 'scenes/player.tscn#HealthComponent:scene-node:5',
        name: 'HealthComponent',
        kind: 'scene-node',
        filePath: '/workspace/game/scenes/player.tscn',
        range: {
          startLine: 5,
          startColumn: 1,
          endLine: 5,
        },
        metadata: {
          language: 'godot-resource',
          pluginKind: 'scene-node',
          source: 'codegraphy.gdscript',
        },
      },
    ]);
  });

  it('extracts resource symbols from text resources', () => {
    const symbols = extractTextResourceSymbols(
      '[gd_resource type="Resource" load_steps=2 format=3]\n[resource]',
      '/workspace/game/resources/enemy_spawn_config.tres',
      'resources/enemy_spawn_config.tres',
    );

    expect(symbols).toEqual([
      {
        id: 'resources/enemy_spawn_config.tres#EnemySpawnConfig:resource:1',
        name: 'EnemySpawnConfig',
        kind: 'resource',
        filePath: '/workspace/game/resources/enemy_spawn_config.tres',
        range: {
          startLine: 1,
          startColumn: 1,
          endLine: 1,
        },
        metadata: {
          language: 'godot-resource',
          pluginKind: 'resource',
          source: 'codegraphy.gdscript',
        },
      },
    ]);
  });
});
