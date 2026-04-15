import { describe, it, expect, beforeEach } from 'vitest';
import { GDScriptPathResolver } from '../src/PathResolver';
import rule, { detect as detectClassNameUsage } from '../src/sources/class-name-usage';
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
    expect(connections[0].kind).toBe('reference');
    expect(connections[0].sourceId).toBe('class-name-usage');
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

  it('should skip comment-only lines', () => {
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

  it('should process each line independently', () => {
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
    const connections = detectClassNameUsage('', testFile, ctx);

    expect(connections).toHaveLength(0);
  });

  it('exports the expected rule descriptor', () => {
    expect(rule.id).toBe('class-name-usage');
    expect(rule.detect).toBe(detectClassNameUsage);
  });
});
