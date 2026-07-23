/**
 * @fileoverview Integration tests for the Godot GDScript plugin.
 * Uses the shared example GDScript project in repo-root examples/example-godot to verify
 * that the plugin detects connections end-to-end.
 */

import { describe, expect, it } from 'vitest';
import {
  createGDScriptPlugin as createGodotPlugin,
  type IGDScriptAnalyzeFilePlugin,
} from '../src/plugin';


describe('createGDScriptPlugin lifecycle', () => {

    it('should expose manifest metadata', () => {
      const plugin = createGodotPlugin();
      expect(plugin.id).toBe('codegraphy.gdscript');
      expect(plugin.name).toBeTruthy();
      expect(plugin.version).toBeTruthy();
      expect(plugin.apiVersion).toBeTruthy();
      expect(plugin.supportedExtensions).toContain('.gd');
      expect(plugin.supportedExtensions).toContain('.godot');
      expect(plugin.supportedExtensions).toContain('.tscn');
      expect(plugin.supportedExtensions).toContain('.tres');
      expect(plugin.contributeGraphScopeCapabilities?.()).toEqual({
        nodeTypes: [
          'symbol:function',
          'symbol:enum',
          'symbol:constant',
          'variable:plain',
          'plugin:codegraphy.gdscript:symbol:godot-class-name',
          'plugin:codegraphy.gdscript:symbol:scene',
          'plugin:codegraphy.gdscript:symbol:resource',
          'plugin:codegraphy.gdscript:symbol:autoload',
          'plugin:codegraphy.gdscript:symbol:scene-node',
          'plugin:codegraphy.gdscript:symbol:signal',
          'plugin:codegraphy.gdscript:symbol:exported-property',
        ],
        edgeTypes: [
          'call',
          'load',
          'inherit',
          'reference',
          'contains',
          'codegraphy.gdscript:signal-connection',
        ],
      });
      expect(plugin.contributeNodeTypes?.()).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'plugin:codegraphy.gdscript:symbol:signal',
          label: 'Signal',
          matchSymbolKinds: ['signal'],
          matchSymbolPluginKind: 'signal',
          matchSymbolSource: 'codegraphy.gdscript',
        }),
        expect.objectContaining({
          id: 'plugin:codegraphy.gdscript:symbol:exported-property',
          parentId: 'variable',
          matchSymbolKinds: ['variable'],
          matchSymbolPluginKind: 'exported-property',
        }),
      ]));
      expect(plugin.contributeEdgeTypes?.()).toEqual([
        expect.objectContaining({
          id: 'codegraphy.gdscript:signal-connection',
          label: 'Signal Connections',
        }),
      ]);
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



    it('analyzeFile should emit a Godot class_name symbol', async () => {
      const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
      const analysis = await plugin.analyzeFile(
        '/workspace/scripts/player.gd',
        '# comment\nclass_name Player\nextends CharacterBody2D\n',
        '/workspace',
      );

      expect(analysis.symbols).toEqual([
        {
          id: 'scripts/player.gd#Player:godot-class-name',
          name: 'Player',
          kind: 'class',
          filePath: '/workspace/scripts/player.gd',
          signature: 'class_name Player',
          range: {
            startLine: 2,
            startColumn: 1,
            endLine: 2,
            endColumn: 18,
          },
          metadata: {
            language: 'gdscript',
            source: 'codegraphy.gdscript',
            pluginKind: 'godot-class-name',
          },
        },
      ]);
    });



    it('analyzeFile should emit GDScript declaration symbols', async () => {
      const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
      const analysis = await plugin.analyzeFile(
        '/workspace/scripts/utils/math_helpers.gd',
        [
          'class_name MathHelpers',
          'const DEFAULT_RADIUS := 32.0',
          '@export var exported_speed: float = 1.0',
          'var last_point: Vector2',
          'enum SpawnMode { RANDOM, EDGE }',
          'static func random_point_in_circle(radius: float) -> Vector2:',
          '\tvar angle = randf() * TAU',
          '\tvar r = sqrt(randf()) * radius',
          '\treturn Vector2(cos(angle) * r, sin(angle) * r)',
          'func clamp_point(point: Vector2) -> Vector2:',
          '\treturn point',
        ].join('\n'),
        '/workspace',
      );

      expect(analysis.symbols).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'scripts/utils/math_helpers.gd#MathHelpers:godot-class-name',
          kind: 'class',
          name: 'MathHelpers',
        }),
        expect.objectContaining({
          id: 'scripts/utils/math_helpers.gd#DEFAULT_RADIUS:constant',
          kind: 'constant',
          name: 'DEFAULT_RADIUS',
        }),
        expect.objectContaining({
          id: 'scripts/utils/math_helpers.gd#exported_speed:variable',
          kind: 'variable',
          name: 'exported_speed',
        }),
        expect.objectContaining({
          id: 'scripts/utils/math_helpers.gd#last_point:variable',
          kind: 'variable',
          name: 'last_point',
        }),
        expect.objectContaining({
          id: 'scripts/utils/math_helpers.gd#SpawnMode:enum',
          kind: 'enum',
          name: 'SpawnMode',
        }),
        expect.objectContaining({
          id: 'scripts/utils/math_helpers.gd#random_point_in_circle:function',
          kind: 'function',
          name: 'random_point_in_circle',
        }),
        expect.objectContaining({
          id: 'scripts/utils/math_helpers.gd#clamp_point:function',
          kind: 'function',
          name: 'clamp_point',
        }),
      ]));
    });



    it('analyzeFile should emit declaration signatures without inline comments', async () => {
      const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
      const analysis = await plugin.analyzeFile(
        '/workspace/scripts/player_stats.gd',
        'const DEFAULT_HEALTH := 100 # tuned for tutorial pacing',
        '/workspace',
      );

      expect(analysis.symbols).toEqual([
        expect.objectContaining({
          id: 'scripts/player_stats.gd#DEFAULT_HEALTH:constant',
          signature: 'const DEFAULT_HEALTH := 100',
          range: expect.objectContaining({
            endColumn: 28,
          }),
        }),
      ]);
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

    it('analyzeFile should emit call relations for class_name static method calls', async () => {
      const plugin = createGodotPlugin() as IGDScriptAnalyzeFilePlugin;
      await plugin.onPreAnalyze?.([
        {
          absolutePath: '/workspace/scripts/utils/math_helpers.gd',
          relativePath: 'scripts/utils/math_helpers.gd',
          content: 'class_name MathHelpers\nstatic func random_point_in_circle(radius: float) -> Vector2:\n\treturn Vector2.ZERO\n',
        },
        {
          absolutePath: '/workspace/scripts/player.gd',
          relativePath: 'scripts/player.gd',
          content: 'class_name Player\n',
        },
      ], '/workspace');

      const analysis = await plugin.analyzeFile(
        '/workspace/scripts/player.gd',
        [
          'class_name Player',
          'func spawn() -> void:',
          '\tvar point = MathHelpers.random_point_in_circle(16.0)',
        ].join('\n'),
        '/workspace',
      );

      expect(analysis.relations).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: 'call',
          sourceId: 'class-name-static-call',
          specifier: 'MathHelpers',
          fromFilePath: '/workspace/scripts/player.gd',
          resolvedPath: '/workspace/scripts/utils/math_helpers.gd',
          toFilePath: '/workspace/scripts/utils/math_helpers.gd',
        }),
      ]));
    });
});
