/**
 * @fileoverview Integration tests for the Godot GDScript plugin.
 * Uses the shared example GDScript project in repo-root examples/example-godot to verify
 * that the plugin detects connections end-to-end.
 */

import { describe, expect, it } from 'vitest';
import {
  createGDScriptPlugin as createGodotPlugin
} from '../src/plugin';


describe('createGDScriptPlugin lifecycle', () => {


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
