import { describe, it, expect, beforeEach } from 'vitest';
import { GDScriptPathResolver } from '../src/PathResolver';
import { detect as detectPreload } from '../src/sources/preload';
import type { GDScriptRuleContext } from '../src/parser';

describe('preload rule', () => {
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

  it('should detect preload with double quotes', () => {
    const content = 'const Player = preload("res://scenes/player.gd")';
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://scenes/player.gd');
    expect(connections[0].kind).toBe('load');
    expect(connections[0].type).toBe('static');
    expect(connections[0].sourceId).toBe('preload');
  });

  it('should detect preload with single quotes', () => {
    const content = "const Enemy = preload('res://scenes/enemy.gd')";
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://scenes/enemy.gd');
  });

  it('should detect multiple preloads on same line', () => {
    const content = 'var a = preload("res://a.gd"); var b = preload("res://b.gd")';
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(2);
    expect(connections[0].specifier).toBe('res://a.gd');
    expect(connections[1].specifier).toBe('res://b.gd');
  });

  it('should detect preload with .tscn files', () => {
    const content = 'const Scene = preload("res://scenes/level.tscn")';
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://scenes/level.tscn');
  });

  it('should handle whitespace in preload', () => {
    const content = 'const X = preload(  "res://test.gd"  )';
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://test.gd');
  });

  it('should ignore commented preload', () => {
    const content = '# const X = preload("res://test.gd")';
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(0);
  });

  it('should ignore inline comment after code', () => {
    const content = 'var x = preload("res://a.gd") # preload("res://b.gd")';
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://a.gd');
  });

  it('should not match non-res paths', () => {
    const content = 'var x = preload("file://local/path.gd")';
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(0);
  });

  it('should resolve to absolute path', () => {
    const content = 'const P = preload("res://scripts/player.gd")';
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].resolvedPath).toContain('scripts/player.gd');
  });

  it('should detect preload with no space before parenthesis', () => {
    const content = 'const X = preload("res://test.gd")';
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://test.gd');
  });

  it('should detect preload with space before parenthesis', () => {
    const content = 'const X = preload ("res://test.gd")';
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://test.gd');
  });

  it('should skip line starting with # but process line ending with #', () => {
    const content = 'var x = preload("res://a.gd") #comment\n# preload("res://b.gd")';
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://a.gd');
  });

  it('should process each line independently', () => {
    const content = 'var a = preload("res://first.gd")\nvar b = preload("res://second.gd")';
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(2);
    expect(connections[0].specifier).toBe('res://first.gd');
    expect(connections[1].specifier).toBe('res://second.gd');
  });

  it('should handle user:// paths in preload', () => {
    const content = 'var x = preload("user://saves/data.gd")';
    const connections = detectPreload(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('user://saves/data.gd');
  });

  it('should handle empty file', () => {
    expect(detectPreload('', testFile, ctx)).toHaveLength(0);
  });

  it('should handle file with only comments', () => {
    const content = '# This is a comment\n# Another comment';
    expect(detectPreload(content, testFile, ctx)).toHaveLength(0);
  });
});
