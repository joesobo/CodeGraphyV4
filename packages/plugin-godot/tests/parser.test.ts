/**
 * @fileoverview Tests for GDScript parser utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  detectClassNameDeclaration,
  isResPath,
  normalizePath,
  parseGDScriptDocument,
  parseGDScriptResourceReferences,
  stripGDScriptComment,
} from '../src/parser';

describe('GDScript parser', () => {
  describe('normalizePath', () => {
    it('should replace backslashes with forward slashes', () => {
      expect(normalizePath('scripts\\player.gd')).toBe('scripts/player.gd');
    });

    it('should leave forward slashes unchanged', () => {
      expect(normalizePath('scripts/player.gd')).toBe('scripts/player.gd');
    });

    it('should handle multiple backslashes', () => {
      expect(normalizePath('scripts\\enemies\\boss.gd')).toBe('scripts/enemies/boss.gd');
    });
  });

  describe('isResPath', () => {
    it('should return true for res:// paths', () => {
      expect(isResPath('res://scripts/player.gd')).toBe(true);
    });

    it('should return true for user:// paths', () => {
      expect(isResPath('user://saves/game.tres')).toBe(true);
    });

    it('should return false for other paths', () => {
      expect(isResPath('file://local/path.gd')).toBe(false);
      expect(isResPath('./relative.gd')).toBe(false);
      expect(isResPath('SomeClassName')).toBe(false);
    });
  });

  describe('detectClassNameDeclaration', () => {
    it('should detect class_name declaration', () => {
      const ref = detectClassNameDeclaration('class_name Player', 1);
      expect(ref).not.toBeNull();
      expect(ref!.resPath).toBe('Player');
      expect(ref!.referenceType).toBe('class_name');
      expect(ref!.isDeclaration).toBe(true);
      expect(ref!.importType).toBe('static');
      expect(ref!.line).toBe(1);
    });

    it('should detect class_name with leading whitespace', () => {
      const ref = detectClassNameDeclaration('  class_name Enemy', 5);
      expect(ref).not.toBeNull();
      expect(ref!.resPath).toBe('Enemy');
      expect(ref!.line).toBe(5);
    });

    it('should detect class_name with multiple spaces (\\s+ not just \\s)', () => {
      const ref = detectClassNameDeclaration('class_name   Player', 1);
      expect(ref).not.toBeNull();
      expect(ref!.resPath).toBe('Player');
    });

    it('should detect class_name with tab separator', () => {
      const ref = detectClassNameDeclaration('class_name\tBoss', 1);
      expect(ref).not.toBeNull();
      expect(ref!.resPath).toBe('Boss');
    });

    it('should return null for non-class_name lines', () => {
      expect(detectClassNameDeclaration('extends Node2D', 1)).toBeNull();
      expect(detectClassNameDeclaration('var player: Player', 1)).toBeNull();
      expect(detectClassNameDeclaration('# class_name Commented', 1)).toBeNull();
      expect(detectClassNameDeclaration('var class_name Player', 1)).toBeNull();
      expect(detectClassNameDeclaration('', 1)).toBeNull();
    });
  });

  describe('stripGDScriptComment', () => {
    it('keeps leading whitespace when there is no comment', () => {
      expect(stripGDScriptComment('  var x = 1')).toBe('  var x = 1');
    });

    it('strips comments after a line that starts with a quoted string', () => {
      expect(stripGDScriptComment('"literal" # trailing comment')).toBe('"literal"');
    });

    it('keeps hash characters inside single-quoted strings', () => {
      expect(stripGDScriptComment("const Scene = preload('res://menu#v2.tscn') # comment"))
        .toBe("const Scene = preload('res://menu#v2.tscn')");
    });

    it('keeps hash characters after escaped quotes inside strings', () => {
      expect(stripGDScriptComment('var text = "say \\"#not-comment\\"" # comment'))
        .toBe('var text = "say \\"#not-comment\\""');
    });
  });

  describe('parseGDScriptDocument', () => {
    it('preserves line numbers while stripping comments outside quoted strings', () => {
      const document = parseGDScriptDocument([
        '# full comment',
        'const Scene = preload("res://scenes/menu#v2.tscn") # inline comment',
        '',
        'var x = 1',
      ].join('\n'));

      expect(document.statements).toEqual([
        {
          line: 2,
          raw: 'const Scene = preload("res://scenes/menu#v2.tscn") # inline comment',
          code: 'const Scene = preload("res://scenes/menu#v2.tscn")',
          trimmed: 'const Scene = preload("res://scenes/menu#v2.tscn")',
        },
        {
          line: 4,
          raw: 'var x = 1',
          code: 'var x = 1',
          trimmed: 'var x = 1',
        },
      ]);
    });
  });

  describe('parseGDScriptResourceReferences', () => {
    it('parses load-like and inheritance references from structured statements', () => {
      const references = parseGDScriptResourceReferences([
        'extends "res://scripts/base.gd"',
        'const Scene = preload("res://scenes/main.tscn")',
        'var data = load("res://resources/data.tres")',
        'var runtime = ResourceLoader.load("user://save.tres")',
        '# preload("res://ignored.tscn")',
      ].join('\n'));

      expect(references).toEqual([
        {
          line: 1,
          referenceType: 'extends',
          resPath: 'res://scripts/base.gd',
          importType: 'static',
        },
        {
          line: 2,
          referenceType: 'preload',
          resPath: 'res://scenes/main.tscn',
          importType: 'static',
        },
        {
          line: 3,
          referenceType: 'load',
          resPath: 'res://resources/data.tres',
          importType: 'dynamic',
        },
        {
          line: 4,
          referenceType: 'load',
          resPath: 'user://save.tres',
          importType: 'dynamic',
        },
      ]);
    });
  });
});
