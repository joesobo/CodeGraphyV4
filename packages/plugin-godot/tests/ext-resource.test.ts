import { beforeEach, describe, expect, it } from 'vitest';
import { GDScriptPathResolver } from '../src/PathResolver';
import rule, { detect as detectExtResource } from '../src/sources/ext-resource';
import type { GDScriptRuleContext } from '../src/parser';

describe('ext-resource rule', () => {
  let resolver: GDScriptPathResolver;
  let ctx: GDScriptRuleContext;
  const workspaceRoot = '/workspace/my-game';
  const testFile = '/workspace/my-game/resources/inventory_item.tres';

  beforeEach(() => {
    resolver = new GDScriptPathResolver(workspaceRoot);
    ctx = {
      resolver,
      workspaceRoot,
      relativeFilePath: 'resources/inventory_item.tres',
    };
  });

  it('should detect ext_resource dependencies in .tres files', () => {
    const content = [
      '[gd_resource type="Resource" format=3]',
      '[ext_resource type="Texture2D" path="res://textures/item.png" id="1_tex"]',
      '[ext_resource type="Script" path="res://scripts/item.gd" id="2_script"]',
    ].join('\n');

    const connections = detectExtResource(content, testFile, ctx);

    expect(connections).toHaveLength(2);
    expect(connections[0]).toEqual(
      expect.objectContaining({
        kind: 'load',
        specifier: 'res://textures/item.png',
        sourceId: 'ext-resource',
        type: 'static',
        fromFilePath: testFile,
      }),
    );
    expect(connections[1]).toEqual(
      expect.objectContaining({
        specifier: 'res://scripts/item.gd',
        toFilePath: '/workspace/my-game/scripts/item.gd',
      }),
    );
  });

  it('should detect ext_resource dependencies in .tscn files', () => {
    const content = [
      '[gd_scene load_steps=4 format=3]',
      '[ext_resource type="Script" path="res://scripts/ui/loadout_preview.gd" id="1_script"]',
      '[ext_resource type="Resource" path="res://resources/player_loadout.tres" id="2_loadout"]',
      '[ext_resource type="Texture2D" path="res://textures/player_card.png" id="3_card"]',
    ].join('\n');

    const connections = detectExtResource(content, '/workspace/my-game/scenes/ui/loadout_preview.tscn', {
      ...ctx,
      relativeFilePath: 'scenes/ui/loadout_preview.tscn',
    });

    expect(connections).toHaveLength(3);
    expect(connections.map(connection => connection.specifier)).toEqual([
      'res://scripts/ui/loadout_preview.gd',
      'res://resources/player_loadout.tres',
      'res://textures/player_card.png',
    ]);
    expect(connections.every(connection => connection.sourceId === 'ext-resource')).toBe(true);
    expect(connections.every(connection => connection.kind === 'load')).toBe(true);
  });

  it('should resolve relative ext_resource paths the Godot way', () => {
    const content = [
      '[gd_scene load_steps=3 format=3]',
      '[ext_resource type="Script" path="../../scripts/ui/loadout_preview.gd" id="1_script"]',
      '[ext_resource type="Resource" path="../../resources/player_loadout.tres" id="2_loadout"]',
    ].join('\n');

    const connections = detectExtResource(content, '/workspace/my-game/scenes/ui/loadout_preview.tscn', {
      ...ctx,
      relativeFilePath: 'scenes/ui/loadout_preview.tscn',
    });

    expect(connections).toHaveLength(2);
    expect(connections.map(connection => connection.toFilePath)).toEqual([
      '/workspace/my-game/scripts/ui/loadout_preview.gd',
      '/workspace/my-game/resources/player_loadout.tres',
    ]);
  });

  it('should prefer uid-mapped targets over the text path when available', () => {
    resolver.replaceFileResourceUid('resources/player_loadout.tres', 'uid://player-loadout');

    const content = [
      '[gd_scene load_steps=2 format=3]',
      '[ext_resource type="Resource" uid="uid://player-loadout" path="../../wrong/player_loadout.tres" id="1_loadout"]',
    ].join('\n');

    const connections = detectExtResource(content, '/workspace/my-game/scenes/ui/loadout_preview.tscn', {
      ...ctx,
      relativeFilePath: 'scenes/ui/loadout_preview.tscn',
    });

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('../../wrong/player_loadout.tres');
    expect(connections[0].toFilePath).toBe('/workspace/my-game/resources/player_loadout.tres');
  });

  it('should materialize nested-workspace relative paths without duplicating the project folder', () => {
    const nestedWorkspaceRoot = '/workspace/examples';
    const nestedResolver = new GDScriptPathResolver(nestedWorkspaceRoot);
    const nestedCtx: GDScriptRuleContext = {
      resolver: nestedResolver,
      workspaceRoot: nestedWorkspaceRoot,
      projectRoot: '/workspace/examples/example-godot',
      relativeFilePath: 'example-godot/scenes/ui/loadout_preview.tscn',
    };

    nestedResolver.replaceFileResourceUid(
      'example-godot/resources/player_loadout.tres',
      'uid://player-loadout',
    );

    const content = [
      '[gd_scene load_steps=3 format=3 uid="uid://loadout-preview-scene"]',
      '[ext_resource type="Script" path="../../scripts/ui/loadout_preview.gd" id="1_script"]',
      '[ext_resource type="Resource" uid="uid://player-loadout" path="../../resources/player_loadout.tres" id="2_loadout"]',
    ].join('\n');

    const connections = detectExtResource(
      content,
      '/workspace/examples/example-godot/scenes/ui/loadout_preview.tscn',
      nestedCtx,
    );

    expect(connections.map(connection => connection.toFilePath)).toEqual([
      '/workspace/examples/example-godot/scripts/ui/loadout_preview.gd',
      '/workspace/examples/example-godot/resources/player_loadout.tres',
    ]);
  });

  it('should skip non-resource paths and comments', () => {
    const content = [
      '; [ext_resource type="Texture2D" path="res://textures/skip.png" id="1_skip"]',
      '[ext_resource type="Texture2D" path="user://textures/runtime.png" id="2_runtime"]',
      '[ext_resource type="Texture2D" path="file://textures/nope.png" id="3_nope"]',
    ].join('\n');

    const connections = detectExtResource(content, testFile, ctx);

    expect(connections).toHaveLength(2);
    expect(connections[0].specifier).toBe('user://textures/runtime.png');
    expect(connections[0].resolvedPath).toBeNull();
    expect(connections[1].specifier).toBe('file://textures/nope.png');
    expect(connections[1].resolvedPath).toBeNull();
  });

  it('exports the expected rule descriptor', () => {
    expect(rule.id).toBe('ext-resource');
    expect(rule.detect).toBe(detectExtResource);
  });
});
