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

    it('should detect preload with no space before parenthesis', () => {
      const content = 'const X = preload("res://test.gd")';
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://test.gd');
    });

    it('should detect preload with space before parenthesis', () => {
      const content = 'const X = preload ("res://test.gd")';
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://test.gd');
    });

    it('should skip line starting with # but process line ending with #', () => {
      const content = 'var x = preload("res://a.gd") #comment\n# preload("res://b.gd")';
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://a.gd');
    });

    it('should process each line independently', () => {
      const content = 'var a = preload("res://first.gd")\nvar b = preload("res://second.gd")';
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(2);
      expect(conns[0].specifier).toBe('res://first.gd');
      expect(conns[1].specifier).toBe('res://second.gd');
    });

    it('should handle user:// paths in preload', () => {
      const content = 'var x = preload("user://saves/data.gd")';
      const conns = detectPreload(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('user://saves/data.gd');
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

    it('should detect load with no space before parenthesis', () => {
      const content = 'var x = load("res://test.gd")';
      const conns = detectLoad(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://test.gd');
    });

    it('should detect load with space before parenthesis', () => {
      const content = 'var x = load ("res://test.gd")';
      const conns = detectLoad(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://test.gd');
    });

    it('should detect load with space inside parenthesis', () => {
      const content = 'var x = load( "res://test.gd" )';
      const conns = detectLoad(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
    });

    it('should skip comment lines but process lines ending with #', () => {
      const content = '# load("res://skip.gd")\nvar x = load("res://keep.gd") #comment';
      const conns = detectLoad(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://keep.gd');
    });

    it('should process each line independently', () => {
      const content = 'var a = load("res://first.gd")\nvar b = load("res://second.gd")';
      const conns = detectLoad(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(2);
      expect(conns[0].specifier).toBe('res://first.gd');
      expect(conns[1].specifier).toBe('res://second.gd');
    });

    it('should not match non-res/user paths', () => {
      const content = 'var x = load("file://test.gd")';
      const conns = detectLoad(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(0);
    });

    it('should include ruleId as load', () => {
      const content = 'var x = load("res://test.gd")';
      const conns = detectLoad(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns[0].ruleId).toBe('load');
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

    it('should skip comment lines but process lines ending with #', () => {
      const content = '# extends "res://skip.gd"\nextends "res://keep.gd" #comment';
      const conns = detectExtends(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://keep.gd');
    });

    it('should process each line independently', () => {
      const content = 'extends "res://first.gd"\n# not this\nvar x = 1';
      const conns = detectExtends(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://first.gd');
    });

    it('should include ruleId as extends', () => {
      const content = 'extends "res://base.gd"';
      const conns = detectExtends(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns[0].ruleId).toBe('extends');
    });

    it('should require extends at start of line', () => {
      const content = 'var x = extends "res://nope.gd"';
      const conns = detectExtends(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(0);
    });

    it('should not match extends without quotes (class name)', () => {
      const content = 'extends CharacterBody2D';
      const conns = detectExtends(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(0);
    });

    it('should handle extends with non-res path (no connection)', () => {
      const content = 'extends "file://nope.gd"';
      const conns = detectExtends(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(0);
    });

    it('should require space or whitespace after extends keyword', () => {
      const content = 'extends  "res://spaced.gd"';
      const conns = detectExtends(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('res://spaced.gd');
    });

    it('should detect extends with leading whitespace', () => {
      const content = '  extends "res://base.gd"';
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
      expect(conns[0].specifier).not.toBe('');
      expect(conns[0].ruleId).toBe('class-name-usage');
      expect(conns[0].resolvedPath).toContain('scripts/round_manager.gd');
      expect(conns[0].resolvedPath).not.toBe('');
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

    it('should skip empty lines after comment stripping', () => {
      resolver.registerClassName('Player', 'scripts/player.gd');
      const content = '# just a comment\nvar x: Player';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('Player');
    });

    it('should strip inline comment before detecting', () => {
      resolver.registerClassName('Player', 'scripts/player.gd');
      const content = 'var x: Player # this is a player ref';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
    });

    it('should process each line independently and preserve line context', () => {
      resolver.registerClassName('Player', 'scripts/player.gd');
      resolver.registerClassName('Enemy', 'scripts/enemy.gd');
      const content = 'var p: Player\nvar e: Enemy';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(2);
      expect(conns[0].specifier).toBe('Player');
      expect(conns[1].specifier).toBe('Enemy');
    });

    it('should detect return type annotation', () => {
      resolver.registerClassName('Player', 'scripts/player.gd');
      const content = 'func get_player() -> Player:';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('Player');
    });

    it('should detect is/as type checks', () => {
      resolver.registerClassName('Player', 'scripts/player.gd');
      const content = 'if x is Player:';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
    });

    it('should detect generic types Array[ClassName]', () => {
      resolver.registerClassName('Player', 'scripts/player.gd');
      const content = 'var players: Array[Player]';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
    });

    it('should skip comment-only lines (line becomes empty after # split)', () => {
      resolver.registerClassName('Player', 'scripts/player.gd');
      // Line 1 is comment-only: split('#')[0] = '' → skipped
      // Line 2 has actual code
      const content = '# just a comment\nvar x: Player';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].specifier).toBe('Player');
    });

    it('should pass correct 1-indexed line number to pattern matcher', () => {
      resolver.registerClassName('Alpha', 'scripts/alpha.gd');
      resolver.registerClassName('Beta', 'scripts/beta.gd');
      // Alpha on line 1, blank line 2, Beta on line 3
      const content = 'var a: Alpha\n\nvar b: Beta';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(2);
      // Both should resolve with non-empty specifiers
      expect(conns[0].specifier).toBe('Alpha');
      expect(conns[1].specifier).toBe('Beta');
    });

    it('should produce non-empty resolvedPath for resolved classes', () => {
      resolver.registerClassName('Player', 'scripts/player.gd');
      const content = 'var p: Player';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].resolvedPath).toBeTruthy();
      expect(conns[0].resolvedPath!.length).toBeGreaterThan(0);
    });

    it('should set connection type to static', () => {
      resolver.registerClassName('Player', 'scripts/player.gd');
      const content = 'var p: Player';
      const conns = detectClassNameUsage(content, '/workspace/my-game/scripts/test.gd', ctx);

      expect(conns).toHaveLength(1);
      expect(conns[0].type).toBe('static');
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
      expect(usages.some(r => r.referenceType === 'class_name_usage')).toBe(true);
    });

    it('should detect extends at start of line only', () => {
      // "extends Player" at start → detected
      const refs = detectUsagesInLine('extends Player', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);

      // Not at start → should not match extends pattern
      const refs2 = detectUsagesInLine('  extends Player', 1);
      // trimmed version starts with extends so it matches
      expect(refs2.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('should detect extends ClassName only if line ends properly', () => {
      // Trailing content after class name should not match the extends-specific regex
      const refs = detectUsagesInLine('extends Player # comment', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('should detect type annotation with colon and spaces', () => {
      const refs = detectUsagesInLine('var x : Player', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('should detect type annotation with no space after colon', () => {
      const refs = detectUsagesInLine('var x:Player', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('should detect return type with space after arrow', () => {
      const refs = detectUsagesInLine('func f() -> Player:', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('should detect return type with no space after arrow', () => {
      const refs = detectUsagesInLine('func f() ->Player:', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('should detect static access with space before dot', () => {
      const refs = detectUsagesInLine('Player .new()', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('should detect static access with no space before dot', () => {
      const refs = detectUsagesInLine('Player.new()', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('should detect is keyword with space', () => {
      const refs = detectUsagesInLine('if x is Player:', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('should detect as keyword with space', () => {
      const refs = detectUsagesInLine('var y = x as Player', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('should detect Dictionary with two type params', () => {
      const refs = detectUsagesInLine('var d: Dictionary[Key, Value]', 1);
      const names = refs.map(r => r.resPath);
      expect(names).toContain('Key');
      expect(names).toContain('Value');
    });

    it('should handle function parameter type annotation', () => {
      const refs = detectUsagesInLine('func f(player: Player, enemy: Enemy):', 1);
      const names = refs.map(r => r.resPath);
      expect(names).toContain('Player');
      expect(names).toContain('Enemy');
    });

    it('should handle export var with type annotation', () => {
      const refs = detectUsagesInLine('@export var target: Player', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('should handle onready var with type', () => {
      const refs = detectUsagesInLine('@onready var manager: GameManager = $Manager', 1);
      expect(refs.some(r => r.resPath === 'GameManager')).toBe(true);
    });

    it('should not detect extends for non-uppercase identifiers', () => {
      const refs = detectUsagesInLine('extends node2D', 1);
      // 'node2D' starts with lowercase → should not match extends regex
      expect(refs.every(r => r.resPath !== 'node2D')).toBe(true);
    });

    it('should return correct line number', () => {
      const refs = detectUsagesInLine('var x: Player', 42);
      expect(refs[0].line).toBe(42);
    });

    it('should set importType to static', () => {
      const refs = detectUsagesInLine('extends Player', 1);
      expect(refs[0].importType).toBe('static');
    });

    it('should handle empty line', () => {
      const refs = detectUsagesInLine('', 1);
      expect(refs).toHaveLength(0);
    });

    it('should handle whitespace-only line', () => {
      const refs = detectUsagesInLine('   ', 1);
      expect(refs).toHaveLength(0);
    });

    it('extends regex should require ^ anchor (not match mid-line extends)', () => {
      // "x extends Player" — Player has no dot, colon, is/as, or generic bracket,
      // so NO pattern should catch it (extends has ^ anchor blocking mid-line match)
      const refs = detectUsagesInLine('x extends Player', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(false);
    });

    it('extends regex should require end anchor (not match trailing non-comment content)', () => {
      // "extends Player extra" — the $ anchor prevents matching when "extra" follows
      // Player also has no dot/colon/is/as/bracket context, so no other pattern catches it
      const refs = detectUsagesInLine('extends Player extra', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(false);
    });

    it('extends regex should require \\s+ (multiple spaces valid)', () => {
      const refs = detectUsagesInLine('extends  Player', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('type annotation should require word char before colon', () => {
      // `: Player` without a word char before colon should NOT match type annotation
      const refs = detectUsagesInLine(': Player', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(false);
    });

    it('type annotation should require \\w+ (multi-char) before colon', () => {
      // Single char var name should still work (\\w+ means 1 or more)
      const refs = detectUsagesInLine('var x: Player', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);

      // Longer var name
      const refs2 = detectUsagesInLine('var player_ref: Player', 1);
      expect(refs2.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('is/as should require \\s+ (space) between keyword and class', () => {
      // "is  Player" with two spaces should still match
      const refs = detectUsagesInLine('x is  Player', 1);
      expect(refs.some(r => r.resPath === 'Player')).toBe(true);

      // "as  Player" with two spaces should still match
      const refs2 = detectUsagesInLine('x as  Player', 1);
      expect(refs2.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('type annotation regex should require \\s* not \\S* around colon', () => {
      // With spaces around colon (should still match)
      const refs1 = detectUsagesInLine('var x : Player', 1);
      expect(refs1.some(r => r.resPath === 'Player')).toBe(true);

      // With no space (should match)
      const refs2 = detectUsagesInLine('var x:Player', 1);
      expect(refs2.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('is/as regex should require space after keyword', () => {
      // "x is Player" should match
      const refs1 = detectUsagesInLine('x is Player', 1);
      expect(refs1.some(r => r.resPath === 'Player')).toBe(true);

      // "x as Player" should match
      const refs2 = detectUsagesInLine('x as Player', 1);
      expect(refs2.some(r => r.resPath === 'Player')).toBe(true);
    });

    it('generic regex should handle optional space after comma', () => {
      // "Dictionary[String, Value]" with space after comma
      const refs1 = detectUsagesInLine('var d: Dictionary[String, Value]', 1);
      expect(refs1.some(r => r.resPath === 'Value')).toBe(true);

      // "Dictionary[String,Value]" without space after comma
      const refs2 = detectUsagesInLine('var d: Dictionary[String,Value]', 1);
      expect(refs2.some(r => r.resPath === 'Value')).toBe(true);
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
