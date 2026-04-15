import { describe, it, expect } from 'vitest';
import { detectUsagesInLine } from '../src/sources/class-name-detector';

describe('detectUsagesInLine', () => {
  it('should detect extends by class_name', () => {
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

    expect(refs.map(ref => ref.resPath)).toContain('RoundManager');
  });

  it('should detect static access', () => {
    const refs = detectUsagesInLine('\tRoundManager.new()', 1);

    expect(refs.map(ref => ref.resPath)).toContain('RoundManager');
  });

  it('should detect Array[ClassName] typed array', () => {
    const refs = detectUsagesInLine('var players: Array[Player] = []', 1);

    expect(refs.map(ref => ref.resPath)).toContain('Player');
  });

  it('should detect Dictionary[Key, ClassName] generic', () => {
    const refs = detectUsagesInLine('var map: Dictionary[String, TileManager]', 1);

    expect(refs.map(ref => ref.resPath)).toContain('TileManager');
  });

  it('should detect "is" type check', () => {
    const refs = detectUsagesInLine('if x is SpiritCapSpawner:', 1);

    expect(refs.map(ref => ref.resPath)).toContain('SpiritCapSpawner');
  });

  it('should detect "as" cast', () => {
    const refs = detectUsagesInLine('var casted = x as FairyRingSpawner', 1);

    expect(refs.map(ref => ref.resPath)).toContain('FairyRingSpawner');
  });

  it('should not flag lowercase identifiers', () => {
    const refs = detectUsagesInLine('var x: int = 0', 1);

    expect(refs.map(ref => ref.resPath)).not.toContain('int');
  });

  it('should deduplicate multiple hits on the same name in one line', () => {
    const refs = detectUsagesInLine('var x: RoundManager = RoundManager.new()', 1);

    expect(refs.filter(ref => ref.resPath === 'RoundManager')).toHaveLength(1);
  });

  it('should detect class_name usages across multiple lines', () => {
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

  it('should detect extends at start of trimmed line', () => {
    const refs = detectUsagesInLine('extends Player', 1);
    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);

    const refsIndented = detectUsagesInLine('  extends Player', 1);
    expect(refsIndented.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect extends with trailing comment', () => {
    const refs = detectUsagesInLine('extends Player # comment', 1);

    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect type annotation with colon spacing variants', () => {
    const refsSpaced = detectUsagesInLine('var x : Player', 1);
    expect(refsSpaced.some(ref => ref.resPath === 'Player')).toBe(true);

    const refsNoSpace = detectUsagesInLine('var x:Player', 1);
    expect(refsNoSpace.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect return type with arrow spacing variants', () => {
    const refsSpaced = detectUsagesInLine('func f() -> Player:', 1);
    expect(refsSpaced.some(ref => ref.resPath === 'Player')).toBe(true);

    const refsNoSpace = detectUsagesInLine('func f() ->Player:', 1);
    expect(refsNoSpace.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect static access with space before dot', () => {
    const refs = detectUsagesInLine('Player .new()', 1);

    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect static access without space before dot', () => {
    const refs = detectUsagesInLine('Player.new()', 1);

    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect is keyword', () => {
    const refs = detectUsagesInLine('if x is Player:', 1);

    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect as keyword', () => {
    const refs = detectUsagesInLine('var y = x as Player', 1);

    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should detect Dictionary with two type params', () => {
    const refs = detectUsagesInLine('var d: Dictionary[Key, Value]', 1);
    const names = refs.map(ref => ref.resPath);

    expect(names).toContain('Key');
    expect(names).toContain('Value');
  });

  it('should handle function parameter type annotations', () => {
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

  it('should not match extends mid-line', () => {
    const refs = detectUsagesInLine('x extends Player', 1);

    expect(refs.some(ref => ref.resPath === 'Player')).toBe(false);
  });

  it('should not match extends with trailing non-comment content', () => {
    const refs = detectUsagesInLine('extends Player extra', 1);

    expect(refs.some(ref => ref.resPath === 'Player')).toBe(false);
  });

  it('should match extends with multiple spaces', () => {
    const refs = detectUsagesInLine('extends  Player', 1);

    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should require word char before colon for type annotation', () => {
    const refs = detectUsagesInLine(': Player', 1);

    expect(refs.some(ref => ref.resPath === 'Player')).toBe(false);
  });

  it('should match type annotation with multi-char identifier before colon', () => {
    const refs = detectUsagesInLine('var player_ref: Player', 1);

    expect(refs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should match is/as with multiple spaces', () => {
    const refsIs = detectUsagesInLine('x is  Player', 1);
    expect(refsIs.some(ref => ref.resPath === 'Player')).toBe(true);

    const refsAs = detectUsagesInLine('x as  Player', 1);
    expect(refsAs.some(ref => ref.resPath === 'Player')).toBe(true);
  });

  it('should handle optional space after comma in generics', () => {
    const refsSpaced = detectUsagesInLine('var d: Dictionary[String, Value]', 1);
    expect(refsSpaced.some(ref => ref.resPath === 'Value')).toBe(true);

    const refsNoSpace = detectUsagesInLine('var d: Dictionary[String,Value]', 1);
    expect(refsNoSpace.some(ref => ref.resPath === 'Value')).toBe(true);
  });
});
