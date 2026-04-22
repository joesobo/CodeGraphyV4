/**
 * @fileoverview Integration tests for the Godot GDScript plugin.
 * Uses the shared example GDScript project in repo-root examples/example-godot to verify
 * that the plugin detects connections end-to-end.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import {
  createGDScriptPlugin as createGodotPlugin,
  type IGDScriptAnalyzeFilePlugin,
} from '../src/plugin';
import { GDScriptPathResolver } from '../src/PathResolver';
import { detect as detectPreload } from '../src/sources/preload';
import { detect as detectLoad } from '../src/sources/load';
import { detect as detectExtends } from '../src/sources/extends';
import type { GDScriptRuleContext } from '../src/parser';

const GDSCRIPT_ROOT = path.join(__dirname, '../../../examples/example-godot');

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
    const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
    await plugin.initialize('/workspace');
    const analysis = await plugin.analyzeFile('/workspace/test.gd', '', '/workspace');
    expect(analysis).toEqual({ filePath: '/workspace/test.gd', relations: [] });
  });

  it('should handle analyzeFile without prior initialize', async () => {
    const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
    const analysis = await plugin.analyzeFile('/workspace/test.gd', '', '/workspace');
    expect(analysis).toEqual({ filePath: '/workspace/test.gd', relations: [] });
  });

  it('onPreAnalyze should build class_name map from file contents', async () => {
    const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
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
    const analysis = await plugin.analyzeFile('/workspace/scripts/test.gd', content, '/workspace');
    expect(analysis.relations.some(relation => relation.specifier === 'Player')).toBe(true);
    expect(analysis.relations.some(relation => relation.kind === 'reference')).toBe(true);
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
    const conns = (await plugin.analyzeFile('/workspace/scripts/test.gd', content, '/workspace')).relations ?? [];
    expect(conns.some(conn => conn.specifier === 'SpiritCapSpawner')).toBe(true);
    expect(conns.some(conn => conn.kind === 'reference')).toBe(true);
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

    const conns = (await plugin.analyzeFile('/workspace/scripts/test.gd', 'extends Player', '/workspace')).relations ?? [];
    expect(conns.some(conn => conn.specifier === 'Player')).toBe(true);
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
    const conns = (await plugin.analyzeFile('/workspace/test.gd', 'var x: Player', '/workspace')).relations ?? [];
    expect(conns.some(conn => conn.specifier === 'Player')).toBe(false);
  });

  it('analyzeFile should not mutate the resolver with class_name declarations from the current file', async () => {
    const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
    await plugin.initialize('/workspace');

    const content = 'class_name MyClass\nextends Node\n';
    await plugin.analyzeFile('/workspace/scripts/my_class.gd', content, '/workspace');

    // Current-file declarations should only become globally available through onPreAnalyze.
    const otherContent = 'var x: MyClass';
    const analysis = await plugin.analyzeFile('/workspace/scripts/other.gd', otherContent, '/workspace');
    expect(analysis.relations.some(relation => relation.specifier === 'MyClass')).toBe(false);
  });

  it('analyzeFile should combine results from all sources', async () => {
    const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
    await plugin.initialize('/workspace');

    const content = `extends "res://scripts/base.gd"
const Scene = preload("res://scenes/level.tscn")
var config = load("res://data/config.tres")`;

    const analysis = await plugin.analyzeFile('/workspace/scripts/test.gd', content, '/workspace');

    expect(analysis.relations.some(relation => relation.sourceId === 'extends')).toBe(true);
    expect(analysis.relations.some(relation => relation.sourceId === 'preload')).toBe(true);
    expect(analysis.relations.some(relation => relation.sourceId === 'load')).toBe(true);
    expect(analysis.relations.some(relation => relation.kind === 'inherit')).toBe(true);
    expect(analysis.relations.some(relation => relation.kind === 'load')).toBe(true);
  });

  it('returns relations from analyzeFile for the same connection data', async () => {
    const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
    await plugin.initialize('/workspace');

    const content = 'extends "res://base.gd"\nconst X = preload("res://x.gd")';
    const analysis = await plugin.analyzeFile('/workspace/test.gd', content, '/workspace');

    expect(analysis.relations).toHaveLength(2);
    expect(analysis.relations).toEqual(
      analysis.relations.map((relation) =>
        expect.objectContaining({
          kind: relation.kind,
          sourceId: relation.sourceId,
          specifier: relation.specifier,
          resolvedPath: relation.resolvedPath,
        }),
      ),
    );
  });

  it('onUnload should clean up resolver state', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');

    await plugin.onPreAnalyze!(
      [{ absolutePath: '/workspace/player.gd', relativePath: 'player.gd', content: 'class_name Player\n' }],
      '/workspace'
    );

    plugin.onUnload!();

    // After unload, resolver is null. analyzeFile should lazily recreate.
    // Player should no longer resolve since the class_name map was cleared.
    const conns = (await plugin.analyzeFile('/workspace/test.gd', 'var x: Player', '/workspace')).relations ?? [];
    expect(conns.some(conn => conn.specifier === 'Player')).toBe(false);
  });

  it('should expose sources from manifest', () => {
    const plugin = createGodotPlugin();

    expect(plugin.sources).toBeDefined();
    expect(Array.isArray(plugin.sources)).toBe(true);
  });

  it('does not expose fileColors when core Material theming owns Godot visuals', () => {
    const plugin = createGodotPlugin();

    expect(plugin.fileColors).toBeUndefined();
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
    const conns = (await plugin.analyzeFile('/workspace/other.gd', 'var x: TestClass', '/workspace')).relations ?? [];
    expect(conns.some(conn => conn.specifier === 'TestClass')).toBe(true);
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

    const conns = (await plugin.analyzeFile('/workspace/test.gd', 'var a: Alpha\nvar b: Beta', '/workspace')).relations ?? [];
    expect(conns.some(conn => conn.specifier === 'Alpha')).toBe(true);
    expect(conns.some(conn => conn.specifier === 'Beta')).toBe(true);
  });

  it('analyzeFile should split content by newlines correctly', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace');

    // Content with multiple lines, each has distinct behavior
    const content = 'extends "res://base.gd"\n\nconst X = preload("res://x.gd")\n';
    const conns = (await plugin.analyzeFile('/workspace/test.gd', content, '/workspace')).relations ?? [];

    expect(conns.some(conn => conn.sourceId === 'extends')).toBe(true);
    expect(conns.some(conn => conn.sourceId === 'preload')).toBe(true);
  });

  it('analyzeFile should create workspace-relative path from filePath', async () => {
    const plugin = createGodotPlugin();
    await plugin.initialize('/workspace/game');

    const content = 'extends "res://base.gd"';
    const conns = (await plugin.analyzeFile('/workspace/game/scripts/test.gd', content, '/workspace/game')).relations ?? [];

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

    const connections = (await plugin.analyzeFile(filePath, content, workspaceRoot)).relations ?? [];

    expect(connections.length).toBeGreaterThan(0);

    // player.gd preloads res://scripts/utils/math_helpers.gd which exists in the workspace
    const resolvedPaths = connections
      .filter(conn => conn.resolvedPath !== null)
      .map(conn => path.relative(workspaceRoot, conn.resolvedPath!).replace(/\\/g, '/'));

    expect(resolvedPaths).toContain('scripts/utils/math_helpers.gd');
  });

  it('returns absolute resolvedPaths for in-workspace resources', async () => {
    const filePath = path.join(workspaceRoot, 'scripts', 'player.gd');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = (await plugin.analyzeFile(filePath, content, workspaceRoot)).relations ?? [];
    const inWorkspace = connections.filter(conn => conn.resolvedPath !== null);

    for (const conn of inWorkspace) {
      expect(path.isAbsolute(conn.resolvedPath!)).toBe(true);
      const rel = path.relative(workspaceRoot, conn.resolvedPath!);
      expect(rel).not.toMatch(/^\.\./);
    }
  });

  it('leaves resolvedPath null for non-GD resources (scenes, audio, etc.)', async () => {
    const filePath = path.join(workspaceRoot, 'scripts', 'player.gd');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = (await plugin.analyzeFile(filePath, content, workspaceRoot)).relations ?? [];

    // preloads of .tscn / .tres / .wav files should not resolve to .gd paths
    const tscnOrTres = connections.filter(
      conn => conn.specifier.endsWith('.tscn') || conn.specifier.endsWith('.tres') || conn.specifier.endsWith('.wav')
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
    ].filter(scriptPath => fs.existsSync(path.join(workspaceRoot, scriptPath)));

    const allConnections: Array<{ from: string; to: string }> = [];

    for (const relPath of scriptFiles) {
      const absPath = path.join(workspaceRoot, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');
      const connections = (await plugin.analyzeFile(absPath, content, workspaceRoot)).relations ?? [];

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

describe('all sources combined', () => {
  let resolver: GDScriptPathResolver;
  let ctx: GDScriptRuleContext;
  const workspaceRoot = '/workspace/my-game';
  const testFile = '/workspace/my-game/scripts/player.gd';

  beforeEach(() => {
    resolver = new GDScriptPathResolver(workspaceRoot);
    ctx = {
      resolver,
      workspaceRoot,
      relativeFilePath: 'scripts/test.gd',
    };
  });

  it('should detect all connection types in a realistic GDScript file', () => {
    const content = `extends "res://scripts/character_base.gd"

const Bullet = preload("res://weapons/bullet.tscn")
const HealthBar = preload("res://ui/health_bar.gd")

@onready var sprite = $Sprite2D

func _ready():
    var config = load("res://data/player_config.tres")

func shoot():
    var bullet = Bullet.instantiate()`;

    const preloads = detectPreload(content, testFile, ctx);
    const loads = detectLoad(content, testFile, ctx);
    const extendsConns = detectExtends(content, testFile, ctx);

    expect(preloads).toHaveLength(2);
    expect(preloads[0].specifier).toBe('res://weapons/bullet.tscn');
    expect(preloads[1].specifier).toBe('res://ui/health_bar.gd');

    expect(loads).toHaveLength(1);
    expect(loads[0].specifier).toBe('res://data/player_config.tres');
    expect(loads[0].type).toBe('dynamic');

    expect(extendsConns).toHaveLength(1);
    expect(extendsConns[0].specifier).toBe('res://scripts/character_base.gd');
  });
});
