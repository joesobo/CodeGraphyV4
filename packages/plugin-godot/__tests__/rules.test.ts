/**
 * @fileoverview Tests for GDScript rule detection modules.
 * Each rule's detect() function is tested with a mock GDScriptPathResolver.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GDScriptPathResolver } from '../src/PathResolver';
import { detect as detectPreload } from '../src/rules/preload';
import { detect as detectLoad } from '../src/rules/load';
import { detect as detectExtends } from '../src/rules/extends';
import { detect as detectClassNameUsage, detectUsagesInLine } from '../src/rules/class-name-usage';
import type { GDScriptRuleContext } from '../src/parser';

describe('GDScript rules', () => {
  let resolver: GDScriptPathResolver;
  let ctx: GDScriptRuleContext;
  const workspaceRoot = '/workspace/my-game';

  beforeEach(() => {
    resolver = new GDScriptPathResolver(workspaceRoot);
    ctx = {
      resolver,
      workspaceRoot,
      relativeFilePath: 'scripts/test.gd',
    };
  });

  describe('preload rule', () => {
    it('should detect preload with double quotes', () => {
      const content = 'const Player = preload("res://scenes/player.gd")';
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://scenes/player.gd');
      expect(conns[0].type).toBe('static');
      expect(conns[0].ruleId).toBe('preload');
    });

    it('should detect preload with single quotes', () => {
      const content = "const Enemy = preload('res://scenes/enemy.gd')";
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://scenes/enemy.gd');
    });

    it('should detect multiple preloads on same line', () => {
      const content = 'var a = preload("res://a.gd"); var b = preload("res://b.gd")';
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(2);
      expect(conns[0].specifier).toBe('res://a.gd');
      expect(conns[1].specifier).toBe('res://b.gd');
    });

    it('should detect preload with .tscn files', () => {
      const content = 'const Scene = preload("res://scenes/level.tscn")';
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://scenes/level.tscn');
    });

    it('should handle whitespace in preload', () => {
      const content = 'const X = preload(  "res://test.gd"  )';
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://test.gd');
    });

    it('should ignore commented preload', () => {
      const content = '# const X = preload("res://test.gd")';
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(0);
    });

    it('should ignore inline comment after code', () => {
      const content = 'var x = preload("res://a.gd") # preload("res://b.gd")';
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://a.gd');
    });

    it('should not match non-res paths', () => {
      const content = 'var x = preload("file://local/path.gd")';
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(0);
    });

    it('should resolve to absolute path', () => {
      const content = 'const P = preload("res://scripts/player.gd")';
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].resolvedPath).toContain('scripts/player.gd');
    });
  });

  describe('load rule', () => {
    it('should detect load with double quotes', () => {
      const content = 'var scene = load("res://scenes/enemy.tscn")';
      const conns = detectLoad(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://scenes/enemy.tscn');
      expect(conns[0].type).toBe('dynamic');
      expect(conns[0].ruleId).toBe('load');
    });

    it('should detect ResourceLoader.load', () => {
      const content = 'var res = ResourceLoader.load("res://data/config.tres")';
      const conns = detectLoad(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://data/config.tres');
    });

    it('should detect load with user:// paths', () => {
      const content = 'var save = load("user://saves/game.tres")';
      const conns = detectLoad(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('user://saves/game.tres');
    });

    it('should not match preload() calls', () => {
      const content = 'var x = preload("res://test.gd")';
      const conns = detectLoad(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(0);
    });
  });

  describe('extends rule', () => {
    it('should detect extends with file path', () => {
      const content = 'extends "res://scripts/base_character.gd"';
      const conns = detectExtends(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://scripts/base_character.gd');
      expect(conns[0].type).toBe('static');
      expect(conns[0].ruleId).toBe('extends');
    });

    it('should ignore extends with built-in class (no quotes)', () => {
      const content = 'extends Node2D';
      const conns = detectExtends(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(0);
    });

    it('should detect extends with single quotes', () => {
      const content = "extends 'res://base.gd'";
      const conns = detectExtends(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://base.gd');
    });
  });

  describe('class-name-usage rule', () => {
    it('should detect extends by class_name when resolver knows the class', () => {
      resolver.registerClassName('RoundManager', 'scripts/round_manager.gd');
      const content = 'extends RoundManager';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('RoundManager');
      expect(conns[0].ruleId).toBe('class-name-usage');
      expect(conns[0].resolvedPath).toContain('scripts/round_manager.gd');
    });

    it('should discard unresolved class_name usages', () => {
      // Node2D is not registered, so it should be discarded
      const content = 'var x: Node2D';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(0);
    });

    it('should detect type-annotated variable when resolved', () => {
      resolver.registerClassName('RoundManager', 'scripts/round_manager.gd');
      const content = 'var round_manager: RoundManager';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('RoundManager');
    });

    it('should detect static access when resolved', () => {
      resolver.registerClassName('RoundManager', 'scripts/round_manager.gd');
      const content = '\tRoundManager.new()';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('RoundManager');
    });

    it('should deduplicate multiple hits on the same class in one line', () => {
      resolver.registerClassName('RoundManager', 'scripts/round_manager.gd');
      const content = 'var x: RoundManager = RoundManager.new()';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
    });
  });

  describe('detectUsagesInLine', () => {
    it('should detect extends by class_name (no quotes)', () => {
      const refs = detectUsagesInLine('extends RoundManager', 1);
      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('RoundManager');
      expect(refs[0].referenceType).toBe('class_name_usage');
      expect(refs[0].isDeclaration).toBe(false);
    });

    it('should detect type-annotated variable', () => {
      const refs = detectUsagesInLine('var round_manager: RoundManager', 1);
      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('RoundManager');
    });

    it('should detect type-annotated const', () => {
      const refs = detectUsagesInLine('const MANAGER: RoundManager = null', 1);
      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('RoundManager');
    });

    it('should detect return type annotation', () => {
      const refs = detectUsagesInLine('func get_manager() -> RoundManager:', 1);
      const names = refs.map(r => r.resPath);
      expect(names).toContain('RoundManager');
    });

    it('should detect static access', () => {
      const refs = detectUsagesInLine('\tRoundManager.new()', 1);
      const names = refs.map(r => r.resPath);
      expect(names).toContain('RoundManager');
    });

    it('should detect Array[ClassName] typed array', () => {
      const refs = detectUsagesInLine('var players: Array[Player] = []', 1);
      const names = refs.map(r => r.resPath);
      expect(names).toContain('Player');
    });

    it('should detect Dictionary[Key, ClassName] generic', () => {
      const refs = detectUsagesInLine('var map: Dictionary[String, TileManager]', 1);
      const names = refs.map(r => r.resPath);
      expect(names).toContain('TileManager');
    });

    it('should detect "is" type check', () => {
      const refs = detectUsagesInLine('if x is SpiritCapSpawner:', 1);
      const names = refs.map(r => r.resPath);
      expect(names).toContain('SpiritCapSpawner');
    });

    it('should detect "as" cast', () => {
      const refs = detectUsagesInLine('var casted = x as FairyRingSpawner', 1);
      const names = refs.map(r => r.resPath);
      expect(names).toContain('FairyRingSpawner');
    });

    it('should not flag lowercase identifiers', () => {
      const refs = detectUsagesInLine('var x: int = 0', 1);
      expect(refs.map(r => r.resPath)).not.toContain('int');
    });

    it('should deduplicate multiple hits on the same name in one line', () => {
      const refs = detectUsagesInLine('var x: RoundManager = RoundManager.new()', 1);
      const names = refs.map(r => r.resPath);
      expect(names.filter(n => n === 'RoundManager')).toHaveLength(1);
    });

    it('should detect class_name usages via detectUsagesInLine on each line', () => {
      const lines = [
        'extends Node',
        'var round_manager: RoundManager',
      ];
      const usages = lines.flatMap((line, i) =>
        detectUsagesInLine(line.split('#')[0], i + 1)
      );
      expect(usages.some(r => r.resPath === 'RoundManager')).toBe(true);
      // 'Node' starts with uppercase but is also detected -- filtering is the resolver's job
      expect(usages.some(r => r.referenceType === 'class_name_usage')).toBe(true);
    });
  });

  describe('complex file (all rules combined)', () => {
    it('should detect all connection types in a realistic GDScript file', () => {
      const content = `extends "res://scripts/character_base.gd"

const Bullet = preload("res://weapons/bullet.tscn")
const HealthBar = preload("res://ui/health_bar.gd")

@onready var sprite = $Sprite2D

func _ready():
    var config = load("res://data/player_config.tres")

func shoot():
    var bullet = Bullet.instantiate()`;

      const filePath = '/workspace/my-game/scripts/player.gd';

      const preloads = detectPreload(content, filePath, ctx);
      const loads = detectLoad(content, filePath, ctx);
      const exts = detectExtends(content, filePath, ctx);

      expect(preloads).toHaveLength(2);
      expect(preloads[0].specifier).toBe('res://weapons/bullet.tscn');
      expect(preloads[1].specifier).toBe('res://ui/health_bar.gd');

      expect(loads).toHaveLength(1);
      expect(loads[0].specifier).toBe('res://data/player_config.tres');
      expect(loads[0].type).toBe('dynamic');

      expect(exts).toHaveLength(1);
      expect(exts[0].specifier).toBe('res://scripts/character_base.gd');
    });
  });

  describe('edge cases', () => {
    it('should handle empty file', () => {
      const content = '';
      const filePath = '/workspace/my-game/scripts/test.gd';

      expect(detectPreload(content, filePath, ctx)).toHaveLength(0);
      expect(detectLoad(content, filePath, ctx)).toHaveLength(0);
      expect(detectExtends(content, filePath, ctx)).toHaveLength(0);
      expect(detectClassNameUsage(content, filePath, ctx)).toHaveLength(0);
    });

    it('should handle file with only comments', () => {
      const content = `# This is a comment
# Another comment`;
      const filePath = '/workspace/my-game/scripts/test.gd';

      expect(detectPreload(content, filePath, ctx)).toHaveLength(0);
      expect(detectLoad(content, filePath, ctx)).toHaveLength(0);
      expect(detectExtends(content, filePath, ctx)).toHaveLength(0);
    });
  });
});
