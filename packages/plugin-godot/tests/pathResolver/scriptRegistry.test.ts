import { describe, expect, it } from 'vitest';
import { GDScriptScriptRegistry } from '../../src/pathResolver/scriptRegistry';

describe('GDScriptScriptRegistry', () => {
  it('resolves explicit and snake_case class names', () => {
    const registry = new GDScriptScriptRegistry();
    registry.registerFile('scripts/spirit_cap_spawner.gd');
    registry.registerClassName('Player', 'scripts/player_impl.gd');

    expect(registry.resolveSnakeCaseFile('SpiritCapSpawner')).toBe('scripts/spirit_cap_spawner.gd');
    expect(registry.resolveClassName('Player')).toBe('scripts/player_impl.gd');
  });

  it('replaces class names for a file and reports changes', () => {
    const registry = new GDScriptScriptRegistry();

    expect(registry.replaceFileClassNames('scripts/player.gd', ['Player']).changed).toBe(true);
    expect(registry.replaceFileClassNames('scripts/player.gd', ['Player']).changed).toBe(false);
    expect(registry.resolveClassName('Player')).toBe('scripts/player.gd');

    expect(registry.replaceFileClassNames('scripts/player.gd', ['Hero']).changed).toBe(true);
    expect(registry.resolveClassName('Player')).toBeNull();
    expect(registry.resolveClassName('Hero')).toBe('scripts/player.gd');

    expect(registry.replaceFileClassNames('scripts/player.gd', []).changed).toBe(true);
    expect(registry.resolveClassName('Hero')).toBeNull();
  });

  it('reports changes when one of several previous class names is removed', () => {
    const registry = new GDScriptScriptRegistry();
    registry.replaceFileClassNames('scripts/player.gd', ['Player', 'Hero']);

    expect(registry.replaceFileClassNames('scripts/player.gd', ['Player']).changed).toBe(true);
    expect(registry.resolveClassName('Player')).toBe('scripts/player.gd');
    expect(registry.resolveClassName('Hero')).toBeNull();
  });

  it('does not delete a class mapping that now belongs to another file', () => {
    const registry = new GDScriptScriptRegistry();
    registry.registerClassName('Player', 'scripts/old_player.gd');
    registry.registerClassName('Player', 'scripts/new_player.gd');

    registry.replaceFileClassNames('scripts/old_player.gd', []);

    expect(registry.resolveClassName('Player')).toBe('scripts/new_player.gd');
  });

  it('returns defensive copies and clears state', () => {
    const registry = new GDScriptScriptRegistry();
    registry.registerFile('scripts/player.gd');
    registry.registerClassName('Player', 'scripts/player.gd');

    registry.getClassNameMap().set('Injected', 'bad.gd');
    registry.getFileNameMap().set('injected', 'bad.gd');

    expect(registry.getClassNameMap().has('Injected')).toBe(false);
    expect(registry.getFileNameMap().has('injected')).toBe(false);
    expect(registry.getRegisteredFiles()).toEqual(['scripts/player.gd']);

    registry.clear();
    expect(registry.getRegisteredFiles()).toEqual([]);
    expect(registry.resolveClassName('Player')).toBeNull();
  });
});
