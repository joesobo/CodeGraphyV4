/**
 * @fileoverview Tests for GDScript parser utilities.
 */

import { describe, it, expect } from 'vitest';
import { detectClassNameDeclaration, isResPath } from '../src/parser';

describe('GDScript parser', () => {
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
      expect(detectClassNameDeclaration('', 1)).toBeNull();
    });
  });
});
