/**
 * @fileoverview Integration tests for the Godot GDScript plugin.
 * Uses the shared example GDScript project in repo-root examples/example-godot to verify
 * that the plugin detects connections end-to-end.
 */

import { describe, expect, it } from 'vitest';
import {
  createGDScriptPlugin as createGodotPlugin,
  type IGDScriptAnalyzeFilePlugin,
} from '../src/plugin';


describe('createGDScriptPlugin lifecycle', () => {


    it('onPreAnalyze should register files for snake_case fallback', async () => {
      const plugin = createGodotPlugin();
      await plugin.initialize('/workspace');

      const files = [
        {
          absolutePath: '/workspace/scripts/spirit_cap_spawner.gd',
          relativePath: 'scripts/spirit_cap_spawner.gd',
          content: 'extends Node\n',
        },
      ];

      await plugin.onPreAnalyze!(files, '/workspace');

      // SpiritCapSpawner should resolve via snake_case fallback
      const content = 'var x: SpiritCapSpawner';
      const conns = (await plugin.analyzeFile('/workspace/scripts/test.gd', content, '/workspace')).relations ?? [];
      expect(conns.some(conn => conn.specifier === 'SpiritCapSpawner')).toBe(true);
      expect(conns.some(conn => conn.kind === 'reference')).toBe(true);
    });



    it('onPreAnalyze should work without prior initialize', async () => {
      const plugin = createGodotPlugin();

      const files = [
        {
          absolutePath: '/workspace/scripts/player.gd',
          relativePath: 'scripts/player.gd',
          content: 'class_name Player\n',
        },
      ];

      await plugin.onPreAnalyze!(files, '/workspace');

      const conns = (await plugin.analyzeFile('/workspace/scripts/test.gd', 'extends Player', '/workspace')).relations ?? [];
      expect(conns.some(conn => conn.specifier === 'Player')).toBe(true);
    });



    it('onPreAnalyze should clear previous class names before re-scanning', async () => {
      const plugin = createGodotPlugin();
      await plugin.initialize('/workspace');

      // First scan with Player
      await plugin.onPreAnalyze!(
        [{ absolutePath: '/workspace/player.gd', relativePath: 'player.gd', content: 'class_name Player\n' }],
        '/workspace'
      );

      // Second scan without Player
      await plugin.onPreAnalyze!(
        [{ absolutePath: '/workspace/enemy.gd', relativePath: 'enemy.gd', content: 'class_name Enemy\n' }],
        '/workspace'
      );

      // Player should no longer resolve
      const conns = (await plugin.analyzeFile('/workspace/test.gd', 'var x: Player', '/workspace')).relations ?? [];
      expect(conns.some(conn => conn.specifier === 'Player')).toBe(false);
    });



    it('onFilesChanged should not request reanalysis when indexed metadata is unchanged', async () => {
      const plugin = createGodotPlugin();
      await plugin.onPreAnalyze!(
        [
          {
            absolutePath: '/workspace/scripts/player.gd',
            relativePath: 'scripts/player.gd',
            content: 'class_name Player\n',
          },
        ],
        '/workspace',
      );

      const changedFiles = await plugin.onFilesChanged!(
        [
          {
            absolutePath: '/workspace/scripts/player.gd',
            relativePath: 'scripts/player.gd',
            content: 'class_name Player\n',
          },
        ],
        '/workspace',
      );

      expect(changedFiles).toEqual([]);
    });



    it('onFilesChanged should request script reanalysis when class names change', async () => {
      const plugin = createGodotPlugin();
      await plugin.onPreAnalyze!(
        [
          {
            absolutePath: '/workspace/scripts/player.gd',
            relativePath: 'scripts/player.gd',
            content: 'class_name Player\n',
          },
          {
            absolutePath: '/workspace/scripts/enemy.gd',
            relativePath: 'scripts/enemy.gd',
            content: 'class_name Enemy\n',
          },
        ],
        '/workspace',
      );

      const changedFiles = await plugin.onFilesChanged!(
        [
          {
            absolutePath: '/workspace/scripts/player.gd',
            relativePath: 'scripts/player.gd',
            content: 'class_name Hero\n',
          },
        ],
        '/workspace',
      );

      expect(changedFiles).toEqual([
        'scripts/player.gd',
        'scripts/enemy.gd',
      ]);
    });



    it('onFilesChanged should request text resource reanalysis when resource UIDs change', async () => {
      const plugin = createGodotPlugin();
      await plugin.onPreAnalyze!(
        [
          {
            absolutePath: '/workspace/resources/loadout.tres',
            relativePath: 'resources/loadout.tres',
            content: '[gd_resource type=Resource uid=uid://loadout]',
          },
          {
            absolutePath: '/workspace/scenes/preview.tscn',
            relativePath: 'scenes/preview.tscn',
            content: '[gd_scene load_steps=2 format=3]',
          },
        ],
        '/workspace',
      );

      const changedFiles = await plugin.onFilesChanged!(
        [
          {
            absolutePath: '/workspace/resources/loadout.tres',
            relativePath: 'resources/loadout.tres',
            content: '[gd_resource type=Resource uid=uid://new-loadout]',
          },
        ],
        '/workspace',
      );

      expect(changedFiles).toEqual([
        'resources/loadout.tres',
        'scenes/preview.tscn',
      ]);
    });


    it('onFilesChanged should request signal declaration reanalysis when receiver connections change', async () => {
      const plugin = createGodotPlugin();
      await plugin.onPreAnalyze!(
        [
          {
            absolutePath: '/workspace/scripts/player.gd',
            relativePath: 'scripts/player.gd',
            content: [
              'class_name Player',
              'signal fired',
            ].join('\n'),
          },
          {
            absolutePath: '/workspace/scripts/main.gd',
            relativePath: 'scripts/main.gd',
            content: [
              'class_name Main',
              'var _player: Player',
            ].join('\n'),
          },
        ],
        '/workspace',
      );

      const addedConnectionTargets = await plugin.onFilesChanged!(
        [
          {
            absolutePath: '/workspace/scripts/main.gd',
            relativePath: 'scripts/main.gd',
            content: [
              'class_name Main',
              'var _player: Player',
              'func _ready() -> void:',
              '\t_player.fired.connect(_on_player_fired)',
            ].join('\n'),
          },
        ],
        '/workspace',
      );

      expect(addedConnectionTargets).toEqual(['scripts/player.gd']);

      const removedConnectionTargets = await plugin.onFilesChanged!(
        [
          {
            absolutePath: '/workspace/scripts/main.gd',
            relativePath: 'scripts/main.gd',
            content: [
              'class_name Main',
              'var _player: Player',
            ].join('\n'),
          },
        ],
        '/workspace',
      );

      expect(removedConnectionTargets).toEqual(['scripts/player.gd']);
    });



    it('analyzeFile should not mutate the resolver with class_name declarations from the current file', async () => {
      const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
      await plugin.initialize('/workspace');

      const content = 'class_name MyClass\nextends Node\n';
      await plugin.analyzeFile('/workspace/scripts/my_class.gd', content, '/workspace');

      // Current-file declarations should only become globally available through onPreAnalyze.
      const otherContent = 'var x: MyClass';
      const analysis = await plugin.analyzeFile('/workspace/scripts/other.gd', otherContent, '/workspace');
      expect(analysis.relations.some(relation => relation.specifier === 'MyClass')).toBe(false);
    });
});
