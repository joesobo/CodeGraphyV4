/**
 * @fileoverview Integration tests for the Godot GDScript plugin.
 * Uses the shared example GDScript project in repo-root examples/example-godot to verify
 * that the plugin detects connections end-to-end.
 */

import * as fs from 'fs';
import * as path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createGDScriptPlugin as createGodotPlugin
} from '../src/plugin';

const GDSCRIPT_ROOT = path.join(__dirname, '../../../examples/example-godot');

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
        .filter(conn => conn.target.path !== null)
        .map(conn => path.relative(workspaceRoot, conn.target.path!).replace(/\\/g, '/'));

      expect(resolvedPaths).toContain('scripts/utils/math_helpers.gd');
    });



    it('returns absolute resolvedPaths for in-workspace resources', async () => {
      const filePath = path.join(workspaceRoot, 'scripts', 'player.gd');
      const content = fs.readFileSync(filePath, 'utf-8');

      const connections = (await plugin.analyzeFile(filePath, content, workspaceRoot)).relations ?? [];
      const inWorkspace = connections.filter(conn => conn.target.path !== null);

      for (const conn of inWorkspace) {
        expect(path.isAbsolute(conn.target.path!)).toBe(true);
        const rel = path.relative(workspaceRoot, conn.target.path!);
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
        if (conn.target.path !== null) {
          expect(conn.target.path).not.toMatch(/\.gd$/);
        }
      }
    });



    it('detects cross-file connections across the example project', async () => {
      const scriptFiles = [
        'scripts/player.gd',
        'scripts/enemy.gd',
        'scripts/game_manager.gd',
        'scripts/base/entity.gd',
        'scripts/ui/loadout_preview.gd',
        'scripts/utils/math_helpers.gd',
      ].filter(scriptPath => fs.existsSync(path.join(workspaceRoot, scriptPath)));

      const allConnections: Array<{ from: string; to: string }> = [];

      for (const relPath of scriptFiles) {
        const absPath = path.join(workspaceRoot, relPath);
        const content = fs.readFileSync(absPath, 'utf-8');
        const connections = (await plugin.analyzeFile(absPath, content, workspaceRoot)).relations ?? [];

        for (const conn of connections) {
          if (conn.target.path) {
            const toRel = path.relative(workspaceRoot, conn.target.path).replace(/\\/g, '/');
            if (scriptFiles.includes(toRel)) {
              allConnections.push({ from: relPath, to: toRel });
            }
          }
        }
      }

      // player.gd → scripts/utils/math_helpers.gd is the key in-project edge
      expect(allConnections.some(e => e.from === 'scripts/player.gd' && e.to === 'scripts/utils/math_helpers.gd')).toBe(true);
    });



    it('detects ext_resource connections across the example project text resources', async () => {
      const resourceFiles = [
        'resources/player_loadout.tres',
        'scenes/ui/loadout_preview.tscn',
      ].filter(filePath => fs.existsSync(path.join(workspaceRoot, filePath)));

      const allConnections: Array<{ from: string; to: string }> = [];

      for (const relPath of resourceFiles) {
        const absPath = path.join(workspaceRoot, relPath);
        const content = fs.readFileSync(absPath, 'utf-8');
        const connections = (await plugin.analyzeFile(absPath, content, workspaceRoot)).relations ?? [];

        for (const conn of connections) {
          if (conn.target.path) {
            const toRel = path.relative(workspaceRoot, conn.target.path).replace(/\\/g, '/');
            allConnections.push({ from: relPath, to: toRel });
          }
        }
      }

      expect(allConnections).toEqual(
        expect.arrayContaining([
          { from: 'resources/player_loadout.tres', to: 'scripts/data/player_loadout.gd' },
          { from: 'resources/player_loadout.tres', to: 'textures/player_card.png' },
          { from: 'scenes/ui/loadout_preview.tscn', to: 'resources/player_loadout.tres' },
          { from: 'scenes/ui/loadout_preview.tscn', to: 'scripts/ui/loadout_preview.gd' },
        ]),
      );
    });
});
