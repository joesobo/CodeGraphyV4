/**
 * @fileoverview Tests for Godot resource utility functions.
 */

import { describe, expect, it } from 'vitest';
import {
  toSnakeCase
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
});
