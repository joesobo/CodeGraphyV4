/**
 * @fileoverview Integration tests for the Godot GDScript plugin.
 * Uses the example GDScript project in src/plugins/godot/examples to verify
 * that the plugin detects connections end-to-end.
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { createGDScriptPlugin as createGodotPlugin } from '../../../src/plugins/godot';

const GDSCRIPT_ROOT = path.join(__dirname, '../../../src/plugins/godot/examples');

describe('Godot GDScript Plugin Integration', () => {
  const plugin = createGodotPlugin();
  const workspaceRoot = GDSCRIPT_ROOT;

  it('detects preload connections in player.gd', async () => {
    const filePath = path.join(workspaceRoot, 'scripts', 'player.gd');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);

    expect(connections.length).toBeGreaterThan(0);

    // player.gd preloads res://scripts/utils/math_helpers.gd which exists in the workspace
    const resolvedPaths = connections
      .filter(c => c.resolvedPath !== null)
      .map(c => path.relative(workspaceRoot, c.resolvedPath!).replace(/\\/g, '/'));

    expect(resolvedPaths).toContain('scripts/utils/math_helpers.gd');
  });

  it('returns absolute resolvedPaths for in-workspace resources', async () => {
    const filePath = path.join(workspaceRoot, 'scripts', 'player.gd');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    const inWorkspace = connections.filter(c => c.resolvedPath !== null);

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
      c => c.specifier.endsWith('.tscn') || c.specifier.endsWith('.tres') || c.specifier.endsWith('.wav')
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
    ].filter(f => fs.existsSync(path.join(workspaceRoot, f)));

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
