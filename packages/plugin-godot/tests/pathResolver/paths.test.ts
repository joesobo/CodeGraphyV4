import { describe, expect, it } from 'vitest';
import {
  isRelativeImport,
  isUnsupportedTextResourcePath,
  isUserResourcePath,
  resolveRelativePath,
  resolveResPath,
} from '../../src/pathResolver/paths';

describe('Godot resolver path helpers', () => {
  it('identifies user and relative imports', () => {
    expect(isUserResourcePath('user://save.tres')).toBe(true);
    expect(isUserResourcePath('res://user/save.tres')).toBe(false);
    expect(isRelativeImport('./sibling.gd')).toBe(true);
    expect(isRelativeImport('../parent.gd')).toBe(true);
    expect(isRelativeImport('Sibling')).toBe(false);
  });

  it('rejects unsupported text-resource paths', () => {
    expect(isUnsupportedTextResourcePath('')).toBe(true);
    expect(isUnsupportedTextResourcePath('user://save.tres')).toBe(true);
    expect(isUnsupportedTextResourcePath('file://tmp/save.tres')).toBe(true);
    expect(isUnsupportedTextResourcePath('/tmp/save.tres')).toBe(true);
    expect(isUnsupportedTextResourcePath('../resources/save.tres')).toBe(false);
  });

  it('normalizes res and relative paths', () => {
    expect(resolveResPath('res://scripts\\player.gd')).toBe('scripts/player.gd');
    expect(resolveRelativePath('../resources/player.tres', 'scenes/ui/loadout.tscn'))
      .toBe('scenes/resources/player.tres');
  });
});
