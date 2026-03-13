/**
 * @fileoverview Tests for Godot resource utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  toSnakeCase,
  isGodotResource,
  getSupportedExtensions,
} from '../src/resource-utils';

describe('resource-utils', () => {
  describe('toSnakeCase', () => {
    it('should convert PascalCase to snake_case', () => {
      // Arrange
      const input = 'SpiritCapSpawner';

      // Act
      const result = toSnakeCase(input);

      // Assert
      expect(result).toBe('spirit_cap_spawner');
    });

    it('should convert acronyms correctly', () => {
      // Arrange
      const input = 'HTTPClient';

      // Act
      const result = toSnakeCase(input);

      // Assert
      expect(result).toBe('http_client');
    });

    it('should return a single lowercase word unchanged', () => {
      // Arrange
      const input = 'player';

      // Act
      const result = toSnakeCase(input);

      // Assert
      expect(result).toBe('player');
    });

    it('should return already snake_case input unchanged', () => {
      // Arrange
      const input = 'spirit_cap_spawner';

      // Act
      const result = toSnakeCase(input);

      // Assert
      expect(result).toBe('spirit_cap_spawner');
    });
  });

  describe('isGodotResource', () => {
    it('should return true for .gd files', () => {
      // Arrange
      const filePath = 'scripts/player.gd';

      // Act
      const result = isGodotResource(filePath);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for .tscn files', () => {
      // Arrange
      const filePath = 'scenes/main.tscn';

      // Act
      const result = isGodotResource(filePath);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for .tres files', () => {
      // Arrange
      const filePath = 'resources/theme.tres';

      // Act
      const result = isGodotResource(filePath);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for .gdshader files', () => {
      // Arrange
      const filePath = 'shaders/outline.gdshader';

      // Act
      const result = isGodotResource(filePath);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for .gdns files', () => {
      // Arrange
      const filePath = 'native/binding.gdns';

      // Act
      const result = isGodotResource(filePath);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for .gdnlib files', () => {
      // Arrange
      const filePath = 'native/library.gdnlib';

      // Act
      const result = isGodotResource(filePath);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for .ts files', () => {
      // Arrange
      const filePath = 'src/index.ts';

      // Act
      const result = isGodotResource(filePath);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for .js files', () => {
      // Arrange
      const filePath = 'dist/bundle.js';

      // Act
      const result = isGodotResource(filePath);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for .py files', () => {
      // Arrange
      const filePath = 'scripts/build.py';

      // Act
      const result = isGodotResource(filePath);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle uppercase extensions case-insensitively', () => {
      // Arrange
      const filePath = 'scripts/player.GD';

      // Act
      const result = isGodotResource(filePath);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return the expected supported extensions', () => {
      // Act
      const result = getSupportedExtensions();

      // Assert
      expect(result).toEqual(['.gd', '.tscn', '.tres', '.gdshader']);
    });
  });
});
