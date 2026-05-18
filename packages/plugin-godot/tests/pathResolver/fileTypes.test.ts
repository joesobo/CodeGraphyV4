import { describe, expect, it } from 'vitest';
import { isGDScriptFile, isGodotTextResourceFile } from '../../src/pathResolver/fileTypes';

describe('Godot resolver file type checks', () => {
  it('recognizes GDScript files only', () => {
    expect(isGDScriptFile('scripts/player.gd')).toBe(true);
    expect(isGDScriptFile('scripts/player.gdshader')).toBe(false);
    expect(isGDScriptFile('scenes/player.tscn')).toBe(false);
  });

  it('recognizes Godot text resources', () => {
    expect(isGodotTextResourceFile('scenes/player.tscn')).toBe(true);
    expect(isGodotTextResourceFile('resources/player.tres')).toBe(true);
    expect(isGodotTextResourceFile('scripts/player.gd')).toBe(false);
  });
});
