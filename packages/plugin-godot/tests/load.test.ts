import { describe, it, expect, beforeEach } from 'vitest';
import { GDScriptPathResolver } from '../src/PathResolver';
import rule, { detect as detectLoad } from '../src/sources/load';
import type { GDScriptRuleContext } from '../src/parser';

describe('load rule', () => {
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

  it('should detect load with double quotes', () => {
    const content = 'var scene = load("res://scenes/enemy.tscn")';
    const connections = detectLoad(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://scenes/enemy.tscn');
    expect(connections[0].kind).toBe('load');
    expect(connections[0].type).toBe('dynamic');
    expect(connections[0].sourceId).toBe('load');
    expect(connections[0].fromFilePath).toBe(testFile);
    expect(connections[0].toFilePath).toContain('scenes/enemy.tscn');
  });

  it('should detect ResourceLoader.load', () => {
    const content = 'var res = ResourceLoader.load("res://data/config.tres")';
    const connections = detectLoad(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://data/config.tres');
  });

  it('should detect load with user:// paths', () => {
    const content = 'var save = load("user://saves/game.tres")';
    const connections = detectLoad(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('user://saves/game.tres');
  });

  it('should not match preload() calls', () => {
    const content = 'var x = preload("res://test.gd")';
    const connections = detectLoad(content, testFile, ctx);

    expect(connections).toHaveLength(0);
  });

  it('should detect load with no space before parenthesis', () => {
    const content = 'var x = load("res://test.gd")';
    const connections = detectLoad(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://test.gd');
  });

  it('should detect load with space before parenthesis', () => {
    const content = 'var x = load ("res://test.gd")';
    const connections = detectLoad(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://test.gd');
  });

  it('should detect load with space inside parenthesis', () => {
    const content = 'var x = load( "res://test.gd" )';
    const connections = detectLoad(content, testFile, ctx);

    expect(connections).toHaveLength(1);
  });

  it('should skip comment lines but process lines ending with #', () => {
    const content = '# load("res://skip.gd")\nvar x = load("res://keep.gd") #comment';
    const connections = detectLoad(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://keep.gd');
  });

  it('should process each line independently', () => {
    const content = 'var a = load("res://first.gd")\nvar b = load("res://second.gd")';
    const connections = detectLoad(content, testFile, ctx);

    expect(connections).toHaveLength(2);
    expect(connections[0].specifier).toBe('res://first.gd');
    expect(connections[1].specifier).toBe('res://second.gd');
  });

  it('should not match non-res/user paths', () => {
    const content = 'var x = load("file://test.gd")';
    const connections = detectLoad(content, testFile, ctx);

    expect(connections).toHaveLength(0);
  });

  it('should include sourceId as load', () => {
    const content = 'var x = load("res://test.gd")';
    const connections = detectLoad(content, testFile, ctx);

    expect(connections[0].sourceId).toBe('load');
  });

  it('should handle empty file', () => {
    expect(detectLoad('', testFile, ctx)).toHaveLength(0);
  });

  it('should handle file with only comments', () => {
    const content = '# This is a comment\n# Another comment';
    expect(detectLoad(content, testFile, ctx)).toHaveLength(0);
  });

  it('exports the expected rule descriptor', () => {
    expect(rule.id).toBe('load');
    expect(rule.detect).toBe(detectLoad);
  });
});
