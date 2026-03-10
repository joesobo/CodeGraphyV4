import { describe, it, expect, beforeEach } from 'vitest';
import { ColorPaletteManager, DEFAULT_FALLBACK_COLOR } from '../../../src/core/colors/ColorPaletteManager';

describe('ColorPaletteManager', () => {
  let manager: ColorPaletteManager;

  beforeEach(() => {
    manager = new ColorPaletteManager();
  });

  describe('generateForExtensions', () => {
    it('should generate colors for given extensions', () => {
      manager.generateForExtensions(['.ts', '.js', '.css']);

      // Should return colors, not the fallback
      expect(manager.getColor('.ts')).not.toBe(DEFAULT_FALLBACK_COLOR);
      expect(manager.getColor('.js')).not.toBe(DEFAULT_FALLBACK_COLOR);
      expect(manager.getColor('.css')).not.toBe(DEFAULT_FALLBACK_COLOR);
    });

    it('should generate distinct colors', () => {
      manager.generateForExtensions(['.ts', '.js', '.css', '.html', '.json']);

      const colors = ['.ts', '.js', '.css', '.html', '.json'].map(ext => manager.getColor(ext));
      const uniqueColors = new Set(colors);

      // All colors should be different
      expect(uniqueColors.size).toBe(5);
    });

    it('should be deterministic (same extensions = same colors)', () => {
      manager.generateForExtensions(['.ts', '.js', '.css']);
      const colors1 = {
        ts: manager.getColor('.ts'),
        js: manager.getColor('.js'),
        css: manager.getColor('.css'),
      };

      // Create new manager and generate again
      const manager2 = new ColorPaletteManager();
      manager2.generateForExtensions(['.ts', '.js', '.css']);
      const colors2 = {
        ts: manager2.getColor('.ts'),
        js: manager2.getColor('.js'),
        css: manager2.getColor('.css'),
      };

      expect(colors1).toEqual(colors2);
    });

    it('should deduplicate extensions', () => {
      manager.generateForExtensions(['.ts', '.ts', '.js', '.js']);

      // Should work fine without errors
      expect(manager.getColor('.ts')).not.toBe(DEFAULT_FALLBACK_COLOR);
    });

    it('should normalize extensions to lowercase with dot', () => {
      manager.generateForExtensions(['ts', 'JS', '.CSS']);

      expect(manager.getColor('.ts')).not.toBe(DEFAULT_FALLBACK_COLOR);
      expect(manager.getColor('.js')).not.toBe(DEFAULT_FALLBACK_COLOR);
      expect(manager.getColor('.css')).not.toBe(DEFAULT_FALLBACK_COLOR);
    });

    it('should handle empty array', () => {
      // Should not throw
      manager.generateForExtensions([]);
      expect(manager.getColor('.ts')).toBe(DEFAULT_FALLBACK_COLOR);
    });
  });

  describe('setPluginColors', () => {
    it('should set plugin colors that override generated', () => {
      manager.generateForExtensions(['.ts', '.js']);
      const generatedColor = manager.getColor('.ts');

      manager.setPluginColors({ '.ts': '#FF0000' });

      expect(manager.getColor('.ts')).toBe('#FF0000');
      expect(manager.getColor('.ts')).not.toBe(generatedColor);
    });

    it('should clear previous plugin colors', () => {
      manager.setPluginColors({ '.ts': '#FF0000', '.js': '#00FF00' });
      manager.setPluginColors({ '.css': '#0000FF' });

      // Old colors should be gone, using fallback
      expect(manager.getColor('.ts')).toBe(DEFAULT_FALLBACK_COLOR);
      expect(manager.getColor('.css')).toBe('#0000FF');
    });

    it('should support filename patterns', () => {
      manager.setPluginColors({ 'project.godot': '#478CBF' });

      expect(manager.getColorForFile('project.godot')).toBe('#478CBF');
      expect(manager.getColorForFile('game/project.godot')).toBe('#478CBF');
    });

    it('should support glob patterns', () => {
      manager.setPluginColors({ '**/*.test.ts': '#10B981' });

      expect(manager.getColorForFile('utils.test.ts')).toBe('#10B981');
      expect(manager.getColorForFile('src/utils.test.ts')).toBe('#10B981');
    });
  });

  describe('addPluginColors', () => {
    it('should add colors without clearing existing', () => {
      manager.setPluginColors({ '.ts': '#FF0000' });
      manager.addPluginColors({ '.js': '#00FF00' });

      expect(manager.getColor('.ts')).toBe('#FF0000');
      expect(manager.getColor('.js')).toBe('#00FF00');
    });
  });

  describe('setUserColors', () => {
    it('should override plugin colors', () => {
      manager.setPluginColors({ '.ts': '#FF0000' });
      manager.setUserColors({ '.ts': '#00FF00' });

      expect(manager.getColor('.ts')).toBe('#00FF00');
    });

    it('should override generated colors', () => {
      manager.generateForExtensions(['.ts']);
      manager.setUserColors({ '.ts': '#123456' });

      expect(manager.getColor('.ts')).toBe('#123456');
    });

    it('should have highest priority', () => {
      manager.generateForExtensions(['.ts']);
      manager.setPluginColors({ '.ts': '#FF0000' });
      manager.setUserColors({ '.ts': '#00FF00' });

      expect(manager.getColor('.ts')).toBe('#00FF00');
    });
  });

  describe('getColor', () => {
    it('should return fallback for unknown extension', () => {
      expect(manager.getColor('.unknown')).toBe(DEFAULT_FALLBACK_COLOR);
    });

    it('should normalize extension', () => {
      manager.setPluginColors({ '.ts': '#FF0000' });

      expect(manager.getColor('ts')).toBe('#FF0000');
      expect(manager.getColor('.ts')).toBe('#FF0000');
      expect(manager.getColor('TS')).toBe('#FF0000');
      expect(manager.getColor('.TS')).toBe('#FF0000');
    });
  });

  describe('getColorInfo', () => {
    it('should return source as generated', () => {
      manager.generateForExtensions(['.ts']);
      const info = manager.getColorInfo('.ts');

      expect(info.source).toBe('generated');
      expect(info.color).not.toBe(DEFAULT_FALLBACK_COLOR);
    });

    it('should return source as plugin', () => {
      manager.setPluginColors({ '.ts': '#FF0000' });
      const info = manager.getColorInfo('.ts');

      expect(info.source).toBe('plugin');
      expect(info.color).toBe('#FF0000');
    });

    it('should return source as user', () => {
      manager.setUserColors({ '.ts': '#00FF00' });
      const info = manager.getColorInfo('.ts');

      expect(info.source).toBe('user');
      expect(info.color).toBe('#00FF00');
    });

    it('should return generated source for fallback', () => {
      const info = manager.getColorInfo('.unknown');

      expect(info.source).toBe('generated');
      expect(info.color).toBe(DEFAULT_FALLBACK_COLOR);
    });
  });

  describe('getColorMap', () => {
    it('should return combined map with proper priority', () => {
      manager.generateForExtensions(['.ts', '.js', '.css']);
      manager.setPluginColors({ '.ts': '#PLUGIN_TS' });
      manager.setUserColors({ '.ts': '#USER_TS', '.html': '#USER_HTML' });

      const map = manager.getColorMap();

      // User override takes precedence
      expect(map['.ts']).toBe('#USER_TS');
      // User color for non-generated ext
      expect(map['.html']).toBe('#USER_HTML');
      // Generated colors for others
      expect(map['.js']).toBeDefined();
      expect(map['.css']).toBeDefined();
    });
  });

  describe('clear', () => {
    it('should clear all colors', () => {
      manager.generateForExtensions(['.ts']);
      manager.setPluginColors({ '.js': '#FF0000' });
      manager.setUserColors({ '.css': '#00FF00' });

      manager.clear();

      expect(manager.getColor('.ts')).toBe(DEFAULT_FALLBACK_COLOR);
      expect(manager.getColor('.js')).toBe(DEFAULT_FALLBACK_COLOR);
      expect(manager.getColor('.css')).toBe(DEFAULT_FALLBACK_COLOR);
    });
  });

  describe('custom generation options', () => {
    it('should accept custom lightness and chroma options', () => {
      const customManager = new ColorPaletteManager({
        lightMin: 50,
        lightMax: 60,
        chromaMin: 80,
        chromaMax: 90,
      });

      customManager.generateForExtensions(['.ts', '.js']);

      // Should generate colors without error
      expect(customManager.getColor('.ts')).not.toBe(DEFAULT_FALLBACK_COLOR);
    });
  });

  describe('getColorForFile', () => {
    it('should match exact filename', () => {
      manager.setUserColors({ '.gitignore': '#6B7280' });
      
      expect(manager.getColorForFile('.gitignore')).toBe('#6B7280');
      expect(manager.getColorForFile('src/.gitignore')).toBe('#6B7280');
    });

    it('should match Makefile (no extension)', () => {
      manager.setUserColors({ 'Makefile': '#FF5733' });
      
      expect(manager.getColorForFile('Makefile')).toBe('#FF5733');
      expect(manager.getColorForFile('src/Makefile')).toBe('#FF5733');
    });

    it('should match Dockerfile', () => {
      manager.setUserColors({ 'Dockerfile': '#2496ED' });
      
      expect(manager.getColorForFile('Dockerfile')).toBe('#2496ED');
      expect(manager.getColorForFile('docker/Dockerfile')).toBe('#2496ED');
    });

    it('should match glob pattern **/*.test.ts', () => {
      manager.setUserColors({ '**/*.test.ts': '#10B981' });
      
      expect(manager.getColorForFile('utils.test.ts')).toBe('#10B981');
      expect(manager.getColorForFile('src/utils.test.ts')).toBe('#10B981');
      expect(manager.getColorForFile('src/lib/deep/utils.test.ts')).toBe('#10B981');
    });

    it('should match scoped glob pattern', () => {
      manager.setUserColors({ 'src/**/*.ts': '#3B82F6' });
      manager.generateForExtensions(['.ts']);
      
      expect(manager.getColorForFile('src/utils.ts')).toBe('#3B82F6');
      expect(manager.getColorForFile('src/lib/utils.ts')).toBe('#3B82F6');
      // Files outside src/ should use extension color
      expect(manager.getColorForFile('tests/utils.ts')).not.toBe('#3B82F6');
    });

    it('should fall back to extension color when no pattern matches', () => {
      manager.generateForExtensions(['.ts']);
      manager.setUserColors({ '.gitignore': '#6B7280' });
      
      const tsColor = manager.getColor('.ts');
      expect(manager.getColorForFile('src/utils.ts')).toBe(tsColor);
    });

    it('should prioritize patterns over extensions', () => {
      manager.generateForExtensions(['.ts']);
      manager.setUserColors({ 
        '.ts': '#FF0000',
        '**/*.test.ts': '#00FF00' 
      });
      
      expect(manager.getColorForFile('utils.ts')).toBe('#FF0000');
      expect(manager.getColorForFile('utils.test.ts')).toBe('#00FF00');
    });

    it('should handle dotfiles like .eslintrc', () => {
      manager.setUserColors({ '.eslintrc': '#4B32C3' });
      
      expect(manager.getColorForFile('.eslintrc')).toBe('#4B32C3');
    });

    it('should handle Windows-style paths', () => {
      manager.setUserColors({ '**/*.test.ts': '#10B981' });
      
      // Backslashes should be normalized
      expect(manager.getColorForFile('src\\utils.test.ts')).toBe('#10B981');
    });
  });

  describe('getColorInfoForFile', () => {
    it('should return user source for pattern matches', () => {
      manager.setUserColors({ '.gitignore': '#6B7280' });
      
      const info = manager.getColorInfoForFile('.gitignore');
      expect(info.source).toBe('user');
      expect(info.color).toBe('#6B7280');
    });

    it('should return generated source for extension fallback', () => {
      manager.generateForExtensions(['.ts']);
      
      const info = manager.getColorInfoForFile('utils.ts');
      expect(info.source).toBe('generated');
    });
  });
});
