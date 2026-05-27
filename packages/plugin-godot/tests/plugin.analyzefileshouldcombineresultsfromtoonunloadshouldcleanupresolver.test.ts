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


    it('analyzeFile should combine results from all sources', async () => {
      const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
      await plugin.initialize('/workspace');

      const content = `extends "res://scripts/base.gd"
  const Scene = preload("res://scenes/level.tscn")
  var config = load("res://data/config.tres")`;

      const analysis = await plugin.analyzeFile('/workspace/scripts/test.gd', content, '/workspace');

      expect(analysis.relations.some(relation => relation.sourceId === 'extends')).toBe(true);
      expect(analysis.relations.some(relation => relation.sourceId === 'preload')).toBe(true);
      expect(analysis.relations.some(relation => relation.sourceId === 'load')).toBe(true);
      expect(analysis.relations.some(relation => relation.kind === 'inherit')).toBe(true);
      expect(analysis.relations.some(relation => relation.kind === 'load')).toBe(true);
    });



    it('analyzeFile should detect ext_resource paths in .tres files', async () => {
      const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
      await plugin.initialize('/workspace');

      const content = [
        '[gd_resource type="Resource" format=3]',
        '[ext_resource type="Texture2D" path="res://textures/item.png" id="1_tex"]',
        '[ext_resource type="Script" path="res://scripts/item.gd" id="2_script"]',
        '[ext_resource type="PackedScene" path="res://scenes/item.tscn" id="3_scene"]',
      ].join('\n');

      const analysis = await plugin.analyzeFile('/workspace/resources/item.tres', content, '/workspace');

      expect(analysis.relations).toHaveLength(3);
      expect(analysis.relations.map(relation => relation.specifier)).toEqual([
        'res://textures/item.png',
        'res://scripts/item.gd',
        'res://scenes/item.tscn',
      ]);
      expect(analysis.relations.every(relation => relation.sourceId === 'ext-resource')).toBe(true);
      expect(analysis.relations.every(relation => relation.kind === 'load')).toBe(true);
    });



    it('analyzeFile should detect ext_resource paths in .tscn files', async () => {
      const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
      await plugin.initialize('/workspace');

      const content = [
        '[gd_scene load_steps=4 format=3]',
        '[ext_resource type="Script" path="res://scripts/ui/loadout_preview.gd" id="1_script"]',
        '[ext_resource type="Resource" path="res://resources/player_loadout.tres" id="2_loadout"]',
        '[ext_resource type="Texture2D" path="res://textures/player_card.png" id="3_card"]',
      ].join('\n');

      const analysis = await plugin.analyzeFile('/workspace/scenes/ui/loadout_preview.tscn', content, '/workspace');

      expect(analysis.relations).toHaveLength(3);
      expect(analysis.relations.map(relation => relation.specifier)).toEqual([
        'res://scripts/ui/loadout_preview.gd',
        'res://resources/player_loadout.tres',
        'res://textures/player_card.png',
      ]);
      expect(analysis.relations.every(relation => relation.sourceId === 'ext-resource')).toBe(true);
      expect(analysis.relations.every(relation => relation.kind === 'load')).toBe(true);
    });



    it('onPreAnalyze should register text resource UIDs from structured headers', async () => {
      const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
      await plugin.initialize('/workspace');

      await plugin.onPreAnalyze!(
        [
          {
            absolutePath: '/workspace/resources/player_loadout.tres',
            relativePath: 'resources/player_loadout.tres',
            content: '[gd_resource type=Resource uid=uid://player-loadout]',
          },
        ],
        '/workspace',
      );

      const analysis = await plugin.analyzeFile(
        '/workspace/scenes/loadout_preview.tscn',
        '[ext_resource type="Resource" uid="uid://player-loadout" path="res://wrong/path.tres" id="1_loadout"]',
        '/workspace',
      );

      expect(analysis.relations).toEqual([
        expect.objectContaining({
          specifier: 'res://wrong/path.tres',
          resolvedPath: '/workspace/resources/player_loadout.tres',
        }),
      ]);
    });



    it('analyzeFile should detect project settings resource paths in project.godot files', async () => {
      const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
      await plugin.initialize('/workspace');

      const content = [
        '; Example Godot project for CodeGraphy GDScript plugin demo',
        '[gd_resource type="ProjectSettings" load_steps=2 format=3]',
        '',
        'config_version=5',
        '',
        '[application]',
        'config/name="CodeGraphy GDScript Demo"',
        'run/main_scene="res://scenes/main.tscn"',
        '',
        '[autoload]',
        'GameManager="*res://scripts/game_manager.gd"',
      ].join('\n');

      const analysis = await plugin.analyzeFile('/workspace/project.godot', content, '/workspace');

      expect(analysis.relations).toHaveLength(2);
      expect(analysis.relations.map(relation => relation.specifier)).toEqual([
        'res://scenes/main.tscn',
        'res://scripts/game_manager.gd',
      ]);
      expect(analysis.relations.every(relation => relation.sourceId === 'project-settings')).toBe(true);
      expect(analysis.relations.every(relation => relation.kind === 'load')).toBe(true);
    });



    it('returns relations from analyzeFile for the same connection data', async () => {
      const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
      await plugin.initialize('/workspace');

      const content = 'extends "res://base.gd"\nconst X = preload("res://x.gd")';
      const analysis = await plugin.analyzeFile('/workspace/test.gd', content, '/workspace');

      expect(analysis.relations).toHaveLength(2);
      expect(analysis.relations).toEqual(
        analysis.relations.map((relation) =>
          expect.objectContaining({
            kind: relation.kind,
            sourceId: relation.sourceId,
            specifier: relation.specifier,
            resolvedPath: relation.resolvedPath,
          }),
        ),
      );
    });



    it('onUnload should clean up resolver state', async () => {
      const plugin = createGodotPlugin();
      await plugin.initialize('/workspace');

      await plugin.onPreAnalyze!(
        [{ absolutePath: '/workspace/player.gd', relativePath: 'player.gd', content: 'class_name Player\n' }],
        '/workspace'
      );

      plugin.onUnload!();

      // After unload, resolver is null. analyzeFile should lazily recreate.
      // Player should no longer resolve since the class_name map was cleared.
      const conns = (await plugin.analyzeFile('/workspace/test.gd', 'var x: Player', '/workspace')).relations ?? [];
      expect(conns.some(conn => conn.specifier === 'Player')).toBe(false);
    });
});
