import { beforeEach, describe, expect, it } from 'vitest';
import { GDScriptPathResolver } from '../src/PathResolver';
import rule, { detect as detectProjectSettings } from '../src/sources/project-settings';
import type { GDScriptRuleContext } from '../src/parser';

describe('project-settings rule', () => {
  let resolver: GDScriptPathResolver;
  let ctx: GDScriptRuleContext;
  const workspaceRoot = '/workspace/my-game';
  const testFile = '/workspace/my-game/project.godot';

  beforeEach(() => {
    resolver = new GDScriptPathResolver(workspaceRoot);
    ctx = {
      resolver,
      workspaceRoot,
      relativeFilePath: 'project.godot',
    };
  });

  it('should detect the main scene from the application section', () => {
    const content = [
      '[gd_resource type="ProjectSettings" load_steps=1 format=3]',
      '',
      '[application]',
      'run/main_scene="res://scenes/main.tscn"',
    ].join('\n');

    const connections = detectProjectSettings(content, testFile, ctx);

    expect(connections).toHaveLength(1);
    expect(connections[0]).toEqual(
      expect.objectContaining({
        kind: 'load',
        specifier: 'res://scenes/main.tscn',
        sourceId: 'project-settings',
        type: 'static',
        fromFilePath: testFile,
        toFilePath: '/workspace/my-game/scenes/main.tscn',
      }),
    );
  });

  it('should detect autoload scripts and strip the singleton marker', () => {
    const content = [
      '[autoload]',
      'GameManager="*res://scripts/game_manager.gd"',
      'MainMenu="res://scenes/ui/game_ui.tscn"',
    ].join('\n');

    const connections = detectProjectSettings(content, testFile, ctx);

    expect(connections).toHaveLength(2);
    expect(connections.map(connection => connection.specifier)).toEqual([
      'res://scripts/game_manager.gd',
      'res://scenes/ui/game_ui.tscn',
    ]);
    expect(connections.map(connection => connection.toFilePath)).toEqual([
      '/workspace/my-game/scripts/game_manager.gd',
      '/workspace/my-game/scenes/ui/game_ui.tscn',
    ]);
  });

  it('should ignore non-resource project settings', () => {
    const content = [
      '[application]',
      'config/name="CodeGraphy GDScript Demo"',
      'config/features=PackedStringArray("4.2")',
      '',
      '[display]',
      'window/size/viewport_width=1280',
    ].join('\n');

    const connections = detectProjectSettings(content, testFile, ctx);

    expect(connections).toEqual([]);
  });

  it('exports the expected rule descriptor', () => {
    expect(rule.id).toBe('project-settings');
    expect(rule.detect).toBe(detectProjectSettings);
  });
});
