import { describe, it, expect } from 'vitest';
import { globMatch, globToRegex } from '../../src/webview/lib/globMatch';

describe('globMatch', () => {
  describe('extension patterns (*.ext)', () => {
    it('matches files with the given extension', () => {
      expect(globMatch('main.gd', '*.gd')).toBe(true);
      expect(globMatch('src/player.gd', '*.gd')).toBe(true);
      expect(globMatch('src/deep/nested/file.gd', '*.gd')).toBe(true);
    });

    it('does not match different extensions', () => {
      expect(globMatch('main.ts', '*.gd')).toBe(false);
      expect(globMatch('file.gdx', '*.gd')).toBe(false);
    });

    it('matches .tscn files', () => {
      expect(globMatch('scenes/world.tscn', '*.tscn')).toBe(true);
      expect(globMatch('world.tscn', '*.tscn')).toBe(true);
    });

    it('matches multiple-dot extensions', () => {
      expect(globMatch('src/app.test.ts', '*.test.ts')).toBe(true);
      expect(globMatch('app.test.ts', '*.test.ts')).toBe(true);
      expect(globMatch('app.spec.ts', '*.test.ts')).toBe(false);
    });
  });

  describe('folder patterns (dir/*)', () => {
    it('matches files directly in the folder', () => {
      expect(globMatch('src/main.gd', 'src/*')).toBe(true);
      expect(globMatch('src/utils.ts', 'src/*')).toBe(true);
    });

    it('does not match files in subdirectories', () => {
      expect(globMatch('src/sub/file.gd', 'src/*')).toBe(false);
    });

    it('does not match files in other folders', () => {
      expect(globMatch('lib/main.gd', 'src/*')).toBe(false);
    });
  });

  describe('recursive folder patterns (dir/**)', () => {
    it('matches files at any depth', () => {
      expect(globMatch('src/main.gd', 'src/**')).toBe(true);
      expect(globMatch('src/sub/file.gd', 'src/**')).toBe(true);
      expect(globMatch('src/a/b/c/file.gd', 'src/**')).toBe(true);
    });

    it('does not match files outside the folder', () => {
      expect(globMatch('lib/main.gd', 'src/**')).toBe(false);
      expect(globMatch('main.gd', 'src/**')).toBe(false);
    });
  });

  describe('exact filename patterns', () => {
    it('matches exact filenames at any depth', () => {
      expect(globMatch('project.godot', 'project.godot')).toBe(true);
      expect(globMatch('sub/project.godot', 'project.godot')).toBe(true);
    });

    it('does not match partial filenames', () => {
      expect(globMatch('my-project.godot', 'project.godot')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles root-level files', () => {
      expect(globMatch('main.gd', '*.gd')).toBe(true);
    });

    it('handles patterns with dots in extension', () => {
      expect(globMatch('file.d.ts', '*.d.ts')).toBe(true);
      expect(globMatch('src/types/api.d.ts', '*.d.ts')).toBe(true);
    });

    it('handles empty inputs gracefully', () => {
      expect(globMatch('', '*.gd')).toBe(false);
      expect(globMatch('file.gd', '')).toBe(false);
    });
  });
});

describe('globToRegex', () => {
  it('returns a RegExp', () => {
    expect(globToRegex('*.gd')).toBeInstanceOf(RegExp);
  });

  it('escapes regex special characters in patterns', () => {
    // Dots should be literal, not regex wildcards
    const re = globToRegex('*.gd');
    expect(re.test('main.gd')).toBe(true);
    expect(re.test('mainXgd')).toBe(false);
  });
});
