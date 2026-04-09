import { describe, it, expect, beforeEach } from 'vitest';
import { GDScriptPathResolver } from '../src/PathResolver';
import rule, { detect as detectExtends } from '../src/sources/extends';
import type { GDScriptRuleContext } from '../src/parser';

describe('extends rule', () => {
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

  it('should detect extends with file path', () => {
    const content = 'extends "res://scripts/base_character.gd"';
    const connections = detectExtends(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://scripts/base_character.gd');
    expect(connections[0].kind).toBe('inherit');
    expect(connections[0].type).toBe('static');
    expect(connections[0].sourceId).toBe('extends');
    expect(connections[0].fromFilePath).toBe(testFile);
    expect(connections[0].toFilePath).toContain('scripts/base_character.gd');
  });

  it('should ignore extends with built-in class (no quotes)', () => {
    const content = 'extends Node2D';
    const connections = detectExtends(content, testFile, ctx);

    expect(connections).toHaveLength(0);
  });

  it('should detect extends with single quotes', () => {
    const content = "extends 'res://base.gd'";
    const connections = detectExtends(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://base.gd');
  });

  it('should skip comment lines but process lines ending with #', () => {
    const content = '# extends "res://skip.gd"\nextends "res://keep.gd" #comment';
    const connections = detectExtends(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://keep.gd');
  });

  it('should process each line independently', () => {
    const content = 'extends "res://first.gd"\n# not this\nvar x = 1';
    const connections = detectExtends(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://first.gd');
  });

  it('should include sourceId as extends', () => {
    const content = 'extends "res://base.gd"';
    const connections = detectExtends(content, testFile, ctx);

    expect(connections[0].sourceId).toBe('extends');
  });

  it('should require extends at start of line', () => {
    const content = 'var x = extends "res://nope.gd"';
    const connections = detectExtends(content, testFile, ctx);

    expect(connections).toHaveLength(0);
  });

  it('should not match extends without quotes (class name)', () => {
    const content = 'extends CharacterBody2D';
    const connections = detectExtends(content, testFile, ctx);

    expect(connections).toHaveLength(0);
  });

  it('should handle extends with non-res path (no connection)', () => {
    const content = 'extends "file://nope.gd"';
    const connections = detectExtends(content, testFile, ctx);

    expect(connections).toHaveLength(0);
  });

  it('should require space or whitespace after extends keyword', () => {
    const content = 'extends  "res://spaced.gd"';
    const connections = detectExtends(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://spaced.gd');
  });

  it('should detect extends with leading whitespace', () => {
    const content = '  extends "res://base.gd"';
    const connections = detectExtends(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('res://base.gd');
  });

  it('should handle empty file', () => {
    expect(detectExtends('', testFile, ctx)).toHaveLength(0);
  });

  it('should handle file with only comments', () => {
    const content = '# This is a comment\n# Another comment';
    expect(detectExtends(content, testFile, ctx)).toHaveLength(0);
  });

  it('exports the expected rule descriptor', () => {
    expect(rule.id).toBe('extends');
    expect(rule.detect).toBe(detectExtends);
  });
});
