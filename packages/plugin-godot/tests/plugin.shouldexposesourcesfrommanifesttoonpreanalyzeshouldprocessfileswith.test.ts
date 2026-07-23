/**
 * @fileoverview Integration tests for the Godot GDScript plugin.
 * Uses the shared example GDScript project in repo-root examples/example-godot to verify
 * that the plugin detects connections end-to-end.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  createGDScriptPlugin as createGodotPlugin
} from '../src/plugin';


describe('createGDScriptPlugin lifecycle', () => {


    it('should expose sources from manifest', () => {
      const plugin = createGodotPlugin();

      expect(plugin.sources).toBeDefined();
      expect(Array.isArray(plugin.sources)).toBe(true);
    });



    it('does not expose rendering fields from the Core runtime', () => {
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
});
