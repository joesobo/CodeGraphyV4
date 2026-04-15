import { describe, it, expect, beforeEach } from 'vitest';
import { GDScriptPathResolver } from '../src/PathResolver';

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

  describe('snake_case file name fallback', () => {
    it('should resolve PascalCase class to snake_case .gd file', () => {
      resolver.registerFile('scripts/spirit_cap_spawner.gd');
      expect(resolver.resolve('SpiritCapSpawner', 'global.gd')).toBe('scripts/spirit_cap_spawner.gd');
    });

    it('should resolve simple class name', () => {
      resolver.registerFile('scripts/player.gd');
      expect(resolver.resolve('Player', 'global.gd')).toBe('scripts/player.gd');
    });

    it('should prefer explicit class_name over snake_case fallback', () => {
      resolver.registerFile('scripts/player.gd');
      resolver.registerClassName('Player', 'other/player_impl.gd');
      expect(resolver.resolve('Player', 'global.gd')).toBe('other/player_impl.gd');
    });

    it('should return null if no matching file found', () => {
      expect(resolver.resolve('UnknownClass', 'global.gd')).toBeNull();
    });

    it('should ignore non-.gd files', () => {
      resolver.registerFile('scenes/player.tscn');
      expect(resolver.resolve('Player', 'global.gd')).toBeNull();
    });

    it('should clear file name map on clearClassNames', () => {
      resolver.registerFile('scripts/player.gd');
      resolver.clearClassNames();
      expect(resolver.resolve('Player', 'global.gd')).toBeNull();
    });

    it('should convert consecutive uppercase correctly (e.g. HTTPClient)', () => {
      resolver.registerFile('scripts/http_client.gd');
      expect(resolver.resolve('HTTPClient', 'global.gd')).toBe('scripts/http_client.gd');
    });

    it('should convert camelCase with digits', () => {
      resolver.registerFile('scripts/player2_d.gd');
      expect(resolver.resolve('Player2D', 'global.gd')).toBe('scripts/player2_d.gd');
    });
  });

  describe('registerFile', () => {
    it('should only register .gd files', () => {
      resolver.registerFile('scenes/level.tscn');
      const map = resolver.getFileNameMap();
      expect(map.size).toBe(0);
    });

    it('should register .gd files by basename', () => {
      resolver.registerFile('scripts/player.gd');
      const map = resolver.getFileNameMap();
      expect(map.size).toBe(1);
      expect(map.get('player')).toBe('scripts/player.gd');
    });

    it('should handle empty string gracefully', () => {
      resolver.registerFile('');
      const map = resolver.getFileNameMap();
      expect(map.size).toBe(0);
    });
  });

  describe('getFileNameMap', () => {
    it('should return a copy of the file name map', () => {
      resolver.registerFile('scripts/player.gd');
      const map = resolver.getFileNameMap();
      map.set('injected', 'bad.gd');
      // Original should not be affected
      expect(resolver.getFileNameMap().has('injected')).toBe(false);
    });
  });

  describe('resolveResPath', () => {
    it('should normalize backslashes in resolved path', () => {
      const result = resolver.resolve('res://scripts\\enemies\\boss.gd', 'main.gd');
      expect(result).toBe('scripts/enemies/boss.gd');
    });
  });

  describe('resolveRelativePath', () => {
    it('should normalize backslashes in relative path resolution', () => {
      const result = resolver.resolve('./utils/helper.gd', 'scripts/player.gd');
      expect(result).toBe('scripts/utils/helper.gd');
    });
  });

  describe('user:// handling', () => {
    it('should return null for user:// regardless of rest of path', () => {
      expect(resolver.resolve('user://data/save.gd', 'main.gd')).toBeNull();
    });

    it('should specifically match user:// prefix not just contain user', () => {
      resolver.registerFile('scripts/user_manager.gd');
      expect(resolver.resolve('res://scripts/user_manager.gd', 'main.gd')).toBe('scripts/user_manager.gd');
    });

    it('should return null for user:// even if class_name matches the path string', () => {
      // This kills the mutant that replaces startsWith with endsWith or removes the check
      resolver.registerClassName('user://saves/data.gd', 'scripts/data_handler.gd');
      expect(resolver.resolve('user://saves/data.gd', 'main.gd')).toBeNull();
    });
  });

  describe('isGodotResource', () => {
    it('should match .gdns files', () => {
      expect(GDScriptPathResolver.isGodotResource('script.gdns')).toBe(true);
    });

    it('should match .gdnlib files', () => {
      expect(GDScriptPathResolver.isGodotResource('lib.gdnlib')).toBe(true);
    });

    it('should be case-insensitive for extensions', () => {
      expect(GDScriptPathResolver.isGodotResource('file.GD')).toBe(true);
      expect(GDScriptPathResolver.isGodotResource('scene.TSCN')).toBe(true);
    });
  });

  describe('getSupportedExtensions', () => {
    it('should include .gdshader', () => {
      expect(GDScriptPathResolver.getSupportedExtensions()).toContain('.gdshader');
    });
  });
});
