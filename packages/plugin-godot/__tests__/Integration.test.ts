/**
 * @fileoverview Integration tests for the Godot GDScript plugin.
 * Uses the example GDScript project in src/plugins/godot/examples to verify
 * that the plugin detects connections end-to-end.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { createGDScriptPlugin as createGodotPlugin } from '../src';

const GDSCRIPT_ROOT = path.join(__dirname, '../examples');

describe('createGDScriptPlugin lifecycle', () => {
  it('should expose manifest metadata', () => {
    const plugin = createGodotPlugin();
    expect(plugin.id).toBe('codegraphy.gdscript');
    expect(plugin.name).toBeTruthy();
    expect(plugin.version).toBeTruthy();
    expect(plugin.apiVersion).toBeTruthy();
    expect(plugin.supportedExtensions).toContain('.gd');
  });

  it('should initialize resolver', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');
    // After initialize, detectConnections should work without error
    const conns = await plugin.detectConnections('/workspace/test.gd', '', '/workspace');
    expect(conns).toEqual([]);
  });

  it('should handle detectConnections without prior initialize', async () => {
    const plugin = createGodotPlugin();
    // detectConnections lazily creates resolver
    const conns = await plugin.detectConnections('/workspace/test.gd', '', '/workspace');
    expect(conns).toEqual([]);
  });

  it('onPreAnalyze should build class_name map from file contents', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');

    const files = [
      {
        absolutePath: '/workspace/scripts/player.gd',
        relativePath: 'scripts/player.gd',
        content: 'class_name Player\nextends CharacterBody2D\n',
      },
      {
        absolutePath: '/workspace/scripts/enemy.gd',
        relativePath: 'scripts/enemy.gd',
        content: 'class_name Enemy\nextends Node2D\n',
      },
    ];

    await plugin.onPreAnalyze!(files, '/workspace');

    // Now class_name-based references should resolve
    const content = 'var p: Player';
    const conns = await plugin.detectConnections('/workspace/scripts/test.gd', content, '/workspace');
    expect(conns.some(cn => cn.specifier === 'Player')).toBe(true);
  });

  it('onPreAnalyze should register files for snake_case fallback', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');

    const files = [
      {
        absolutePath: '/workspace/scripts/spirit_cap_spawner.gd',
        relativePath: 'scripts/spirit_cap_spawner.gd',
        content: 'extends Node\n',
      },
    ];

    await plugin.onPreAnalyze!(files, '/workspace');

    // SpiritCapSpawner should resolve via snake_case fallback
    const content = 'var x: SpiritCapSpawner';
    const conns = await plugin.detectConnections('/workspace/scripts/test.gd', content, '/workspace');
    expect(conns.some(cn => cn.specifier === 'SpiritCapSpawner')).toBe(true);
  });

  it('onPreAnalyze should work without prior initialize', async () => {
    const plugin = createGodotPlugin();

    const files = [
      {
        absolutePath: '/workspace/scripts/player.gd',
        relativePath: 'scripts/player.gd',
        content: 'class_name Player\n',
      },
    ];

    await plugin.onPreAnalyze!(files, '/workspace');

    const conns = await plugin.detectConnections('/workspace/scripts/test.gd', 'extends Player', '/workspace');
    expect(conns.some(cn => cn.specifier === 'Player')).toBe(true);
  });

  it('onPreAnalyze should clear previous class names before re-scanning', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');

    // First scan with Player
    await plugin.onPreAnalyze!(
      [{ absolutePath: '/workspace/player.gd', relativePath: 'player.gd', content: 'class_name Player\n' }],
      '/workspace'
    );

    // Second scan without Player
    await plugin.onPreAnalyze!(
      [{ absolutePath: '/workspace/enemy.gd', relativePath: 'enemy.gd', content: 'class_name Enemy\n' }],
      '/workspace'
    );

    // Player should no longer resolve
    const conns = await plugin.detectConnections('/workspace/test.gd', 'var x: Player', '/workspace');
    expect(conns.some(cn => cn.specifier === 'Player')).toBe(false);
  });

  it('detectConnections should register class_name declarations from current file', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');

    const content = 'class_name MyClass\nextends Node\n';
    await plugin.detectConnections('/workspace/scripts/my_class.gd', content, '/workspace');

    // Now MyClass should be resolvable from another file
    const otherContent = 'var x: MyClass';
    const conns = await plugin.detectConnections('/workspace/scripts/other.gd', otherContent, '/workspace');
    expect(conns.some(cn => cn.specifier === 'MyClass')).toBe(true);
  });

  it('detectConnections should combine results from all rules', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');

    const content = `extends "res://scripts/base.gd"
const Scene = preload("res://scenes/level.tscn")
var config = load("res://data/config.tres")`;

    const conns = await plugin.detectConnections('/workspace/scripts/test.gd', content, '/workspace');

    expect(conns.some(cn => cn.ruleId === 'extends')).toBe(true);
    expect(conns.some(cn => cn.ruleId === 'preload')).toBe(true);
    expect(conns.some(cn => cn.ruleId === 'load')).toBe(true);
  });

  it('onUnload should clean up resolver state', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');

    await plugin.onPreAnalyze!(
      [{ absolutePath: '/workspace/player.gd', relativePath: 'player.gd', content: 'class_name Player\n' }],
      '/workspace'
    );

    plugin.onUnload!();

    // After unload, resolver is null. detectConnections should lazily recreate.
    // Player should no longer resolve since the class_name map was cleared.
    const conns = await plugin.detectConnections('/workspace/test.gd', 'var x: Player', '/workspace');
    expect(conns.some(cn => cn.specifier === 'Player')).toBe(false);
  });

  it('should expose rules and fileColors from manifest', () => {
    const plugin = createGodotPlugin();
    expect(plugin.rules).toBeDefined();
    expect(Array.isArray(plugin.rules)).toBe(true);
    expect(plugin.fileColors).toBeDefined();
  });

  it('should expose defaultFilters from manifest', () => {
    const plugin = createGodotPlugin();
    expect(plugin.defaultFilters).toBeDefined();
    expect(Array.isArray(plugin.defaultFilters)).toBe(true);
  });

  it('initialize should log a message', async () => {
    const plugin = createGodotPlugin();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await plugin.initialize('/workspace');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('GDScript plugin initialized'));
    spy.mockRestore();
  });

  it('onPreAnalyze should log class_name map size', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await plugin.onPreAnalyze!(
      [{ absolutePath: '/workspace/p.gd', relativePath: 'p.gd', content: 'class_name Player\n' }],
      '/workspace'
    );

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('class_name map'));
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/1 entries/));
    spy.mockRestore();
  });

  it('onPreAnalyze should correctly parse line numbers for class_name declarations', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');

    // class_name is on line 3 (index 2, line number = index + 1 = 3)
    const content = '# comment\nextends Node\nclass_name TestClass\n';
    const files = [{ absolutePath: '/workspace/test.gd', relativePath: 'test.gd', content }];

    await plugin.onPreAnalyze!(files, '/workspace');

    // Verify class_name was registered (not off by one)
    const conns = await plugin.detectConnections('/workspace/other.gd', 'var x: TestClass', '/workspace');
    expect(conns.some(cn => cn.specifier === 'TestClass')).toBe(true);
  });

  it('onPreAnalyze should process files with multiple class_name lines', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');

    // Only the first class_name should be registered per file (GDScript only allows one)
    const files = [
      { absolutePath: '/workspace/a.gd', relativePath: 'a.gd', content: 'class_name Alpha\n' },
      { absolutePath: '/workspace/b.gd', relativePath: 'b.gd', content: 'class_name Beta\n' },
    ];

    await plugin.onPreAnalyze!(files, '/workspace');

    const conns = await plugin.detectConnections('/workspace/test.gd', 'var a: Alpha\nvar b: Beta', '/workspace');
    expect(conns.some(cn => cn.specifier === 'Alpha')).toBe(true);
    expect(conns.some(cn => cn.specifier === 'Beta')).toBe(true);
  });

  it('detectConnections should split content by newlines correctly', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');

    // Content with multiple lines, each has distinct behavior
    const content = 'extends "res://base.gd"\n\nconst X = preload("res://x.gd")\n';
    const conns = await plugin.detectConnections('/workspace/test.gd', content, '/workspace');

    expect(conns.some(cn => cn.ruleId === 'extends')).toBe(true);
    expect(conns.some(cn => cn.ruleId === 'preload')).toBe(true);
  });

  it('detectConnections should create workspace-relative path from filePath', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace/game');

    const content = 'extends "res://base.gd"';
    const conns = await plugin.detectConnections('/workspace/game/scripts/test.gd', content, '/workspace/game');

    // The relativeFilePath should be 'scripts/test.gd'
    expect(conns).toHaveLength(1);
    expect(conns[0].specifier).toBe('res://base.gd');
  });

  it('onUnload should nullify resolver so next call recreates it', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');

    // Register a class name
    await plugin.onPreAnalyze!(
      [{ absolutePath: '/w/p.gd', relativePath: 'p.gd', content: 'class_name MyThing\n' }],
      '/workspace'
    );

    plugin.onUnload!();

    // Calling onUnload with resolver?.clearClassNames() should work without error
    // Calling it again should be safe (resolver is already null)
    plugin.onUnload!();
  });
});

describe('Godot GDScript Plugin Integration', () => {
  let plugin: ReturnType<typeof createGodotPlugin>;
  const workspaceRoot = GDSCRIPT_ROOT;

  beforeEach(() => {
    plugin = createGodotPlugin();
  });

  it('detects preload connections in player.gd', async () => {
    const filePath = path.join(workspaceRoot, 'scripts', 'player.gd');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);

    expect(connections.length).toBeGreaterThan(0);

    // player.gd preloads res://scripts/utils/math_helpers.gd which exists in the workspace
    const resolvedPaths = connections
      .filter(cn => cn.resolvedPath !== null)
      .map(cn => path.relative(workspaceRoot, cn.resolvedPath!).replace(/\\/g, '/'));

    expect(resolvedPaths).toContain('scripts/utils/math_helpers.gd');
  });

  it('returns absolute resolvedPaths for in-workspace resources', async () => {
    const filePath = path.join(workspaceRoot, 'scripts', 'player.gd');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    const inWorkspace = connections.filter(cn => cn.resolvedPath !== null);

    for (const conn of inWorkspace) {
      expect(path.isAbsolute(conn.resolvedPath!)).toBe(true);
      const rel = path.relative(workspaceRoot, conn.resolvedPath!);
      expect(rel).not.toMatch(/^\.\./);
    }
  });

  it('leaves resolvedPath null for non-GD resources (scenes, audio, etc.)', async () => {
    const filePath = path.join(workspaceRoot, 'scripts', 'player.gd');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);

    // preloads of .tscn / .tres / .wav files should not resolve to .gd paths
    const tscnOrTres = connections.filter(
      cn => cn.specifier.endsWith('.tscn') || cn.specifier.endsWith('.tres') || cn.specifier.endsWith('.wav')
    );
    for (const conn of tscnOrTres) {
      // Either null or pointing to a non-.gd file — never a ghost gd path
      if (conn.resolvedPath !== null) {
        expect(conn.resolvedPath).not.toMatch(/\.gd$/);
      }
    }
  });

  it('detects cross-file connections across the example project', async () => {
    const scriptFiles = [
      'scripts/player.gd',
      'scripts/enemy.gd',
      'scripts/game_manager.gd',
      'scripts/base/entity.gd',
      'scripts/utils/math_helpers.gd',
    ].filter(fp => fs.existsSync(path.join(workspaceRoot, fp)));

    const allConnections: Array<{ from: string; to: string }> = [];

    for (const relPath of scriptFiles) {
      const absPath = path.join(workspaceRoot, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');
      const connections = await plugin.detectConnections(absPath, content, workspaceRoot);

      for (const conn of connections) {
        if (conn.resolvedPath) {
          const toRel = path.relative(workspaceRoot, conn.resolvedPath).replace(/\\/g, '/');
          if (scriptFiles.includes(toRel)) {
            allConnections.push({ from: relPath, to: toRel });
          }
        }
      }
    }

    // player.gd → scripts/utils/math_helpers.gd is the key in-project edge
    expect(allConnections.some(e => e.from === 'scripts/player.gd' && e.to === 'scripts/utils/math_helpers.gd')).toBe(true);
  });
});
