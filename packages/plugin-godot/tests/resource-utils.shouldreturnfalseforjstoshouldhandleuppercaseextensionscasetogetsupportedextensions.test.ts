/**
 * @fileoverview Tests for Godot resource utility functions.
 */

import { describe, expect, it } from 'vitest';
import {
  getSupportedExtensions,
  isGodotResource
} from '../src/resource-utils';

describe('resource-utils', () => {
  describe('isGodotResource', () => {


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
