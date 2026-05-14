import { describe, expect, it } from 'vitest';
import { isResPath, normalizePath } from '../../src/gdscript/path';

describe('GDScript path parsing', () => {
  it('normalizes Windows path separators', () => {
    expect(normalizePath('scripts\\enemies\\boss.gd')).toBe('scripts/enemies/boss.gd');
  });

  it('recognizes Godot resource paths', () => {
    expect(isResPath('res://scripts/player.gd')).toBe(true);
    expect(isResPath('user://saves/game.tres')).toBe(true);
    expect(isResPath('file://local/path.gd')).toBe(false);
    expect(isResPath('./relative.gd')).toBe(false);
    expect(isResPath('SomeClassName')).toBe(false);
  });
});
