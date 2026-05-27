/**
 * @fileoverview Tests for Godot resource utility functions.
 */

import { describe, expect, it } from 'vitest';
import {
  isGodotResource
} from '../src/resource-utils';

describe('resource-utils', () => {
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
  });
});
