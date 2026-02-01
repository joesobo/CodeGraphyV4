import { describe, it, expect, beforeEach } from 'vitest';
import { GDScriptPathResolver } from '../../../src/plugins/godot/PathResolver';

describe('GDScriptPathResolver', () => {
  let resolver: GDScriptPathResolver;

  beforeEach(() => {
    resolver = new GDScriptPathResolver('/workspace/my-game');
  });

  describe('res:// path resolution', () => {
    it('should resolve simple res:// path', () => {
      const result = resolver.resolve('res://scripts/player.gd', 'scenes/main.gd');
      expect(result).toBe('scripts/player.gd');
    });

    it('should resolve nested res:// path', () => {
      const result = resolver.resolve('res://entities/enemies/boss.gd', 'main.gd');
      expect(result).toBe('entities/enemies/boss.gd');
    });

    it('should resolve res:// path to root file', () => {
      const result = resolver.resolve('res://project.godot', 'scripts/test.gd');
      expect(result).toBe('project.godot');
    });

    it('should resolve .tscn files', () => {
      const result = resolver.resolve('res://scenes/level.tscn', 'main.gd');
      expect(result).toBe('scenes/level.tscn');
    });

    it('should resolve .tres files', () => {
      const result = resolver.resolve('res://data/config.tres', 'main.gd');
      expect(result).toBe('data/config.tres');
    });
  });

  describe('user:// path handling', () => {
    it('should return null for user:// paths', () => {
      const result = resolver.resolve('user://saves/game.tres', 'main.gd');
      expect(result).toBeNull();
    });
  });

  describe('class_name resolution', () => {
    it('should resolve registered class_name', () => {
      resolver.registerClassName('Player', 'scripts/player.gd');
      
      const result = resolver.resolve('Player', 'scenes/main.gd');
      expect(result).toBe('scripts/player.gd');
    });

    it('should return null for unregistered class_name', () => {
      const result = resolver.resolve('UnknownClass', 'main.gd');
      expect(result).toBeNull();
    });

    it('should handle multiple class_name registrations', () => {
      resolver.registerClassName('Player', 'scripts/player.gd');
      resolver.registerClassName('Enemy', 'scripts/enemy.gd');
      resolver.registerClassName('Boss', 'scripts/boss.gd');
      
      expect(resolver.resolve('Player', 'main.gd')).toBe('scripts/player.gd');
      expect(resolver.resolve('Enemy', 'main.gd')).toBe('scripts/enemy.gd');
      expect(resolver.resolve('Boss', 'main.gd')).toBe('scripts/boss.gd');
    });

    it('should clear class names', () => {
      resolver.registerClassName('Player', 'scripts/player.gd');
      resolver.clearClassNames();
      
      const result = resolver.resolve('Player', 'main.gd');
      expect(result).toBeNull();
    });

    it('should return class name map', () => {
      resolver.registerClassName('Player', 'scripts/player.gd');
      resolver.registerClassName('Enemy', 'scripts/enemy.gd');
      
      const map = resolver.getClassNameMap();
      expect(map.size).toBe(2);
      expect(map.get('Player')).toBe('scripts/player.gd');
      expect(map.get('Enemy')).toBe('scripts/enemy.gd');
    });
  });

  describe('relative path resolution', () => {
    it('should resolve ./ relative path', () => {
      const result = resolver.resolve('./sibling.gd', 'scripts/player.gd');
      expect(result).toBe('scripts/sibling.gd');
    });

    it('should resolve ../ relative path', () => {
      const result = resolver.resolve('../utils.gd', 'scripts/player.gd');
      expect(result).toBe('utils.gd');
    });

    it('should resolve nested ../ path', () => {
      const result = resolver.resolve('../../root.gd', 'scripts/entities/player.gd');
      expect(result).toBe('root.gd');
    });
  });

  describe('static helpers', () => {
    it('should identify Godot resources', () => {
      expect(GDScriptPathResolver.isGodotResource('player.gd')).toBe(true);
      expect(GDScriptPathResolver.isGodotResource('level.tscn')).toBe(true);
      expect(GDScriptPathResolver.isGodotResource('config.tres')).toBe(true);
      expect(GDScriptPathResolver.isGodotResource('shader.gdshader')).toBe(true);
    });

    it('should not identify non-Godot files as resources', () => {
      expect(GDScriptPathResolver.isGodotResource('script.ts')).toBe(false);
      expect(GDScriptPathResolver.isGodotResource('style.css')).toBe(false);
      expect(GDScriptPathResolver.isGodotResource('readme.md')).toBe(false);
    });

    it('should return supported extensions', () => {
      const extensions = GDScriptPathResolver.getSupportedExtensions();
      expect(extensions).toContain('.gd');
      expect(extensions).toContain('.tscn');
      expect(extensions).toContain('.tres');
    });
  });

  describe('edge cases', () => {
    it('should handle empty import path', () => {
      const result = resolver.resolve('', 'main.gd');
      expect(result).toBeNull();
    });

    it('should handle unknown path format', () => {
      const result = resolver.resolve('some/random/path.gd', 'main.gd');
      expect(result).toBeNull();
    });

    it('should normalize backslashes in res:// paths', () => {
      // This shouldn't normally happen, but just in case
      const result = resolver.resolve('res://scripts\\player.gd', 'main.gd');
      expect(result).toBe('scripts/player.gd');
    });
  });
});
