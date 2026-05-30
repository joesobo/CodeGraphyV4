import { describe, expect, it } from 'vitest';
import { GDScriptPathResolver } from '../../src/PathResolver';
import { detectRelations } from '../../src/plugin/relations';
import type { GodotAnalysisContext } from '../../src/plugin/types';

function context(resolver = new GDScriptPathResolver('/workspace/game')): GodotAnalysisContext {
  return {
    resolver,
    workspaceRoot: '/workspace/game',
    relativeFilePath: 'scripts/player.gd',
    projectRoot: '',
  };
}

describe('detectRelations', () => {
  it('dispatches GDScript relationships through code analyzers', () => {
    const resolver = new GDScriptPathResolver('/workspace/game');
    resolver.registerFile('scripts/weapon.gd');

    const relations = detectRelations(
      'const Weapon = preload("res://scripts/weapon.gd")',
      '/workspace/game/scripts/player.gd',
      context(resolver),
    );

    expect(relations).toMatchObject([
      {
        specifier: 'res://scripts/weapon.gd',
        sourceId: 'preload',
        edgeType: 'load',
        timing: 'static',
      },
    ]);
  });

  it('dispatches text resources and project settings to structured parsers', () => {
    const resolver = new GDScriptPathResolver('/workspace/game');

    expect(detectRelations(
      '[ext_resource type="Script" path="res://scripts/player.gd" id="1"]',
      '/workspace/game/scenes/main.tscn',
      context(resolver),
    )).toMatchObject([
      {
        specifier: 'res://scripts/player.gd',
        sourceId: 'ext-resource',
        edgeType: 'load',
        timing: 'static',
      },
    ]);

    expect(detectRelations(
      '[application]\nrun/main_scene="res://scenes/main.tscn"',
      '/workspace/game/project.godot',
      context(resolver),
    )).toMatchObject([
      {
        specifier: 'res://scenes/main.tscn',
        sourceId: 'project-settings',
        edgeType: 'load',
        timing: 'static',
      },
    ]);
  });
});
