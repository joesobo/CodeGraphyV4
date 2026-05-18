import { describe, expect, it } from 'vitest';
import { GodotTextResourceRegistry } from '../../src/pathResolver/textResourceRegistry';

describe('GodotTextResourceRegistry', () => {
  it('registers text-resource files and resolves UIDs', () => {
    const registry = new GodotTextResourceRegistry();
    registry.registerFile('scenes/main.tscn');

    expect(registry.getRegisteredFiles()).toEqual(['scenes/main.tscn']);
    expect(registry.replaceFileResourceUid('scenes/main.tscn', 'uid://main').changed).toBe(true);
    expect(registry.replaceFileResourceUid('scenes/main.tscn', 'uid://main').changed).toBe(false);
    expect(registry.resolveResourceUid('uid://main')).toBe('scenes/main.tscn');
  });

  it('replaces and removes stale UID mappings', () => {
    const registry = new GodotTextResourceRegistry();
    registry.replaceFileResourceUid('scenes/main.tscn', 'uid://old');
    registry.replaceFileResourceUid('scenes/main.tscn', 'uid://new');

    expect(registry.resolveResourceUid('uid://old')).toBeNull();
    expect(registry.resolveResourceUid('uid://new')).toBe('scenes/main.tscn');

    expect(registry.replaceFileResourceUid('scenes/main.tscn', null).changed).toBe(true);
    expect(registry.resolveResourceUid('uid://new')).toBeNull();
  });

  it('does not delete a UID mapping that now belongs to another file', () => {
    const registry = new GodotTextResourceRegistry();
    registry.replaceFileResourceUid('scenes/old.tscn', 'uid://shared');
    registry.replaceFileResourceUid('scenes/new.tscn', 'uid://shared');

    registry.replaceFileResourceUid('scenes/old.tscn', null);

    expect(registry.resolveResourceUid('uid://shared')).toBe('scenes/new.tscn');
  });

  it('clears registered files and UID state', () => {
    const registry = new GodotTextResourceRegistry();
    registry.registerFile('scenes/main.tscn');
    registry.replaceFileResourceUid('scenes/main.tscn', 'uid://main');
    registry.clear();

    expect(registry.getRegisteredFiles()).toEqual([]);
    expect(registry.resolveResourceUid('uid://main')).toBeNull();
  });
});
