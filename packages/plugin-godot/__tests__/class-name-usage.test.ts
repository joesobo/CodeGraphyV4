import { describe, it, expect, beforeEach } from 'vitest';
import { GDScriptPathResolver } from '../src/PathResolver';
import { detect as detectPreload } from '../src/rules/preload';
import { detect as detectLoad } from '../src/rules/load';
import { detect as detectExtends } from '../src/rules/extends';
import { detect as detectClassNameUsage, detectUsagesInLine } from '../src/rules/class-name-usage';
import type { GDScriptRuleContext } from '../src/parser';

describe('class-name-usage rule', () => {
  let resolver: GDScriptPathResolver;
  let ctx: GDScriptRuleContext;
  const workspaceRoot = '/workspace/my-game';
  const testFile = '/workspace/my-game/scripts/test.gd';

  beforeEach(() => {
    resolver = new GDScriptPathResolver(workspaceRoot);
    ctx = {
      resolver,
      workspaceRoot,
      relativeFilePath: 'scripts/test.gd',
    };
  });

  it('should detect extends by class_name when resolver knows the class', () => {
    resolver.registerClassName('RoundManager', 'scripts/round_manager.gd');
    const content = 'extends RoundManager';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('RoundManager');
    expect(connections[0].specifier).not.toBe('');
    expect(connections[0].ruleId).toBe('class-name-usage');
    expect(connections[0].resolvedPath).toContain('scripts/round_manager.gd');
    expect(connections[0].resolvedPath).not.toBe('');
  });

  it('should discard unresolved class_name usages', () => {
    const content = 'var x: Node2D';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(0);
  });

  it('should detect type-annotated variable when resolved', () => {
    resolver.registerClassName('RoundManager', 'scripts/round_manager.gd');
    const content = 'var round_manager: RoundManager';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('RoundManager');
  });

  it('should detect static access when resolved', () => {
    resolver.registerClassName('RoundManager', 'scripts/round_manager.gd');
    const content = '\tRoundManager.new()';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('RoundManager');
  });

  it('should deduplicate multiple hits on the same class in one line', () => {
    resolver.registerClassName('RoundManager', 'scripts/round_manager.gd');
    const content = 'var x: RoundManager = RoundManager.new()';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(1);
  });

  it('should skip empty lines after comment stripping', () => {
    resolver.registerClassName('Player', 'scripts/player.gd');
    const content = '# just a comment\nvar x: Player';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('Player');
  });

  it('should strip inline comment before detecting', () => {
    resolver.registerClassName('Player', 'scripts/player.gd');
    const content = 'var x: Player # this is a player ref';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(1);
  });

  it('should process each line independently and preserve line context', () => {
    resolver.registerClassName('Player', 'scripts/player.gd');
    resolver.registerClassName('Enemy', 'scripts/enemy.gd');
    const content = 'var p: Player\nvar e: Enemy';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(2);
    expect(connections[0].specifier).toBe('Player');
    expect(connections[1].specifier).toBe('Enemy');
  });

  it('should detect return type annotation', () => {
    resolver.registerClassName('Player', 'scripts/player.gd');
    const content = 'func get_player() -> Player:';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('Player');
  });

  it('should detect is/as type checks', () => {
    resolver.registerClassName('Player', 'scripts/player.gd');
    const content = 'if x is Player:';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(1);
  });

  it('should detect generic types Array[ClassName]', () => {
    resolver.registerClassName('Player', 'scripts/player.gd');
    const content = 'var players: Array[Player]';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(1);
  });

  it('should skip comment-only lines (line becomes empty after # split)', () => {
    resolver.registerClassName('Player', 'scripts/player.gd');
    const content = '# just a comment\nvar x: Player';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('Player');
  });

  it('should pass correct 1-indexed line number to pattern matcher', () => {
    resolver.registerClassName('Alpha', 'scripts/alpha.gd');
    resolver.registerClassName('Beta', 'scripts/beta.gd');
    const content = 'var a: Alpha\n\nvar b: Beta';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(2);
    expect(connections[0].specifier).toBe('Alpha');
    expect(connections[1].specifier).toBe('Beta');
  });

  it('should produce non-empty resolvedPath for resolved classes', () => {
    resolver.registerClassName('Player', 'scripts/player.gd');
    const content = 'var p: Player';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].resolvedPath).toBeTruthy();
    expect(connections[0].resolvedPath!.length).toBeGreaterThan(0);
  });

  it('should set connection type to static', () => {
    resolver.registerClassName('Player', 'scripts/player.gd');
    const content = 'var p: Player';
    const connections = detectClassNameUsage(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].type).toBe('static');
  });

  it('should handle empty file', () => {
    expect(detectClassNameUsage('', testFile, ctx)).toHaveLength(0);
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
    const names = refs.map(ref => ref.resPath);
    expect(names).toContain('RoundManager');
  });

  it('should detect static access', () => {
    const refs = detectUsagesInLine('\tRoundManager.new()', 1);
    const names = refs.map(ref => ref.resPath);
    expect(names).toContain('RoundManager');
  });

  it('should detect Array[ClassName] typed array', () => {
    const refs = detectUsagesInLine('var players: Array[Player] = []', 1);
    const names = refs.map(ref => ref.resPath);
    expect(names).toContain('Player');
  });

  it('should detect Dictionary[Key, ClassName] generic', () => {
    const refs = detectUsagesInLine('var map: Dictionary[String, TileManager]', 1);
    const names = refs.map(ref => ref.resPath);
    expect(names).toContain('TileManager');
  });

  it('should detect "is" type check', () => {
    const refs = detectUsagesInLine('if x is SpiritCapSpawner:', 1);
    const names = refs.map(ref => ref.resPath);
    expect(names).toContain('SpiritCapSpawner');
  });

  it('should detect "as" cast', () => {
    const refs = detectUsagesInLine('var casted = x as FairyRingSpawner', 1);
    const names = refs.map(ref => ref.resPath);
    expect(names).toContain('FairyRingSpawner');
  });

  it('should not flag lowercase identifiers', () => {
    const refs = detectUsagesInLine('var x: int = 0', 1);
    expect(refs.map(ref => ref.resPath)).not.toContain('int');
  });

  it('should deduplicate multiple hits on the same name in one line', () => {
    const refs = detectUsagesInLine('var x: RoundManager = RoundManager.new()', 1);
    const names = refs.map(ref => ref.resPath);
    expect(names.filter(name => name === 'RoundManager')).toHaveLength(1);
  });

  it('should detect class_name usages via detectUsagesInLine on each line', () => {
    const lines = [
      'extends Node',
      'var round_manager: RoundManager',
    ];
    const usages = lines.flatMap((line, idx) =>
      detectUsagesInLine(line.split('#')[0], idx + 1)
    );
    expect(usages.some(ref => ref.resPath === 'RoundManager')).toBe(true);
    expect(usages.some(ref => ref.referenceType === 'class_name_usage')).toBe(true);
  });

  it('should detect extends at start of line only', () => {
    const refs = detectUsagesInLine('extends Player', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);

    // trimmed version starts with extends so it matches
    const refs2 = detectUsagesInLine('  extends Player', 1);
    expect(refs2.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect extends ClassName only if line ends properly', () => {
    const refs = detectUsagesInLine('extends Player # comment', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect type annotation with colon and spaces', () => {
    const refs = detectUsagesInLine('var x : Player', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect type annotation with no space after colon', () => {
    const refs = detectUsagesInLine('var x:Player', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect return type with space after arrow', () => {
    const refs = detectUsagesInLine('func f() -> Player:', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect return type with no space after arrow', () => {
    const refs = detectUsagesInLine('func f() ->Player:', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect static access with space before dot', () => {
    const refs = detectUsagesInLine('Player .new()', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect static access with no space before dot', () => {
    const refs = detectUsagesInLine('Player.new()', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect is keyword with space', () => {
    const refs = detectUsagesInLine('if x is Player:', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect as keyword with space', () => {
    const refs = detectUsagesInLine('var y = x as Player', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect Dictionary with two type params', () => {
    const refs = detectUsagesInLine('var d: Dictionary[Key, Value]', 1);
    const names = refs.map(ref => ref.resPath);
    expect(names).toContain('Key');
    expect(names).toContain('Value');
  });

  it('should handle function parameter type annotation', () => {
    const refs = detectUsagesInLine('func f(player: Player, enemy: Enemy):', 1);
    const names = refs.map(ref => ref.resPath);
    expect(names).toContain('Player');
    expect(names).toContain('Enemy');
  });

  it('should handle export var with type annotation', () => {
    const refs = detectUsagesInLine('@export var target: Player', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should handle onready var with type', () => {
    const refs = detectUsagesInLine('@onready var manager: GameManager = $Manager', 1);
    expect(refs.some(ref => ref.resPath === 'GameManager')).toBe(true);
  });

  it('should not detect extends for non-uppercase identifiers', () => {
    const refs = detectUsagesInLine('extends node2D', 1);
    expect(refs.every(ref => ref.resPath !== 'node2D')).toBe(true);
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
    const refs = detectUsagesInLine('x extends Player', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(false);
  });

  it('extends regex should require end anchor (not match trailing non-comment content)', () => {
    const refs = detectUsagesInLine('extends Player extra', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(false);
  });

  it('extends regex should require \\s+ (multiple spaces valid)', () => {
    const refs = detectUsagesInLine('extends  Player', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('type annotation should require word char before colon', () => {
    const refs = detectUsagesInLine(': Player', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(false);
  });

  it('type annotation should require \\w+ (multi-char) before colon', () => {
    const refs = detectUsagesInLine('var x: Player', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);

    const refs2 = detectUsagesInLine('var player_ref: Player', 1);
    expect(refs2.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('is/as should require \\s+ (space) between keyword and class', () => {
    const refs = detectUsagesInLine('x is  Player', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);

    const refs2 = detectUsagesInLine('x as  Player', 1);
    expect(refs2.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('type annotation regex should require \\s* not \\S* around colon', () => {
    const refs1 = detectUsagesInLine('var x : Player', 1);
    expect(refs1.some(ref => ref.resPath === 'Player')).toBe(true);

    const refs2 = detectUsagesInLine('var x:Player', 1);
    expect(refs2.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('is/as regex should require space after keyword', () => {
    const refs1 = detectUsagesInLine('x is Player', 1);
    expect(refs1.some(ref => ref.resPath === 'Player')).toBe(true);

    const refs2 = detectUsagesInLine('x as Player', 1);
    expect(refs2.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('generic regex should handle optional space after comma', () => {
    const refs1 = detectUsagesInLine('var d: Dictionary[String, Value]', 1);
    expect(refs1.some(ref => ref.resPath === 'Value')).toBe(true);

    const refs2 = detectUsagesInLine('var d: Dictionary[String,Value]', 1);
    expect(refs2.some(ref => ref.resPath === 'Value')).toBe(true);
  });
});

describe('all rules combined', () => {
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
    expect(loads[0].type).toBe('dynamic');

    expect(extendsConns).toHaveLength(1);
    expect(extendsConns[0].specifier).toBe('res://scripts/character_base.gd');
  });
});
