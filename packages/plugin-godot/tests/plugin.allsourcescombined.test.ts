/**
 * @fileoverview Integration tests for the Godot GDScript plugin.
 * Uses the shared example GDScript project in repo-root examples/example-godot to verify
 * that the plugin detects connections end-to-end.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { GDScriptRuleContext } from '../src/parser';
import { GDScriptPathResolver } from '../src/PathResolver';
import { detect as detectExtends } from '../src/sources/extends';
import { detect as detectLoad } from '../src/sources/load';
import { detect as detectPreload } from '../src/sources/preload';


describe('all sources combined', () => {

    let resolver: GDScriptPathResolver;


    let ctx: GDScriptRuleContext;


    const workspaceRoot = '/workspace/my-game';


    const testFile = '/workspace/my-game/scripts/player.gd';



    beforeEach(() => {
      resolver = new GDScriptPathResolver(workspaceRoot);
      ctx = {
        resolver,
        workspaceRoot,
        relativeFilePath: 'scripts/test.gd',
      };
    });



    it('should detect all connection types in a realistic GDScript file', () => {
      const content = `extends "res://scripts/character_base.gd"

  const Bullet = preload("res://weapons/bullet.tscn")
  const HealthBar = preload("res://ui/health_bar.gd")

  @onready var sprite = $Sprite2D

  func _ready():
      var config = load("res://data/player_config.tres")

  func shoot():
      var bullet = Bullet.instantiate()`;

      const preloads = detectPreload(content, testFile, ctx);
      const loads = detectLoad(content, testFile, ctx);
      const extendsConns = detectExtends(content, testFile, ctx);

      expect(preloads).toHaveLength(2);
      expect(preloads[0].specifier).toBe('res://weapons/bullet.tscn');
      expect(preloads[1].specifier).toBe('res://ui/health_bar.gd');

      expect(loads).toHaveLength(1);
      expect(loads[0].specifier).toBe('res://data/player_config.tres');
      expect(loads[0].timing).toBe('dynamic');

      expect(extendsConns).toHaveLength(1);
      expect(extendsConns[0].specifier).toBe('res://scripts/character_base.gd');
    });
});
