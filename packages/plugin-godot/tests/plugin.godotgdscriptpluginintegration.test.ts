/**
 * @fileoverview Integration tests for the Godot GDScript plugin.
 * Uses the shared example GDScript project in repo-root examples/example-godot to verify
 * that the plugin detects connections end-to-end.
 */

import * as fs from 'fs';
import * as path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { createGDScriptPlugin as createGodotPlugin } from '../src/plugin';

const GDSCRIPT_ROOT = path.join(__dirname, '../../../examples/example-godot');
const ANALYZED_EXTENSIONS = new Set(['.gd', '.godot', '.tres', '.tscn']);

function toWorkspacePath(filePath: string): string {
  return path.relative(GDSCRIPT_ROOT, filePath).replace(/\\/g, '/');
}

function collectExampleProjectFiles(root: string): Array<{ relativePath: string; absolutePath: string; content: string }> {
  const files: Array<{ relativePath: string; absolutePath: string; content: string }> = [];

  function visit(directory: string): void {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.godot' || entry.name === '.codegraphy') {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }

      if (!ANALYZED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        continue;
      }

      files.push({
        relativePath: toWorkspacePath(absolutePath),
        absolutePath,
        content: fs.readFileSync(absolutePath, 'utf-8'),
      });
    }
  }

  visit(root);
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

async function analyzeExampleProject(
  plugin: ReturnType<typeof createGodotPlugin>,
): Promise<IFileAnalysisResult[]> {
  const files = collectExampleProjectFiles(GDSCRIPT_ROOT);
  await plugin.onPreAnalyze?.(files, GDSCRIPT_ROOT);

  return Promise.all(
    files.map(file => plugin.analyzeFile(file.absolutePath, file.content, GDSCRIPT_ROOT)),
  );
}

describe('Godot GDScript Plugin Integration', () => {

    let plugin: ReturnType<typeof createGodotPlugin>;


    const workspaceRoot = GDSCRIPT_ROOT;



    beforeEach(() => {
      plugin = createGodotPlugin();
    });

    it('emits Godot graph scope symbols across the example project', async () => {
      const results = await analyzeExampleProject(plugin);
      const symbols = results.flatMap(result => result.symbols ?? []);
      const pluginKindCounts = symbols.reduce<Record<string, number>>((counts, symbol) => {
        const pluginKind = symbol.metadata?.pluginKind;
        if (typeof pluginKind !== 'string') {
          return counts;
        }

        return {
          ...counts,
          [pluginKind]: (counts[pluginKind] ?? 0) + 1,
        };
      }, {});

      expect(pluginKindCounts).toEqual({
        'autoload': 1,
        'exported-property': 23,
        'godot-class-name': 12,
        'resource': 1,
        'scene': 5,
        'scene-node': 30,
        'signal': 8,
      });

      expect(symbols.map(symbol => ({
        file: toWorkspacePath(symbol.filePath),
        kind: symbol.kind,
        name: symbol.name,
        pluginKind: symbol.metadata?.pluginKind,
      }))).toEqual(
        expect.arrayContaining([
          {
            file: 'project.godot',
            kind: 'autoload',
            name: 'GameManager',
            pluginKind: 'autoload',
          },
          {
            file: 'resources/enemy_spawn_config.tres',
            kind: 'resource',
            name: 'EnemySpawnConfig',
            pluginKind: 'resource',
          },
          {
            file: 'scenes/main.tscn',
            kind: 'scene',
            name: 'Main',
            pluginKind: 'scene',
          },
          {
            file: 'scenes/player.tscn',
            kind: 'scene-node',
            name: 'HealthComponent',
            pluginKind: 'scene-node',
          },
          {
            file: 'scripts/components/health_component.gd',
            kind: 'signal',
            name: 'health_changed',
            pluginKind: 'signal',
          },
          {
            file: 'scripts/player.gd',
            kind: 'variable',
            name: 'projectile_scene',
            pluginKind: 'exported-property',
          },
        ]),
      );
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
        'scripts/ui/loadout_preview.gd',
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



    it('detects ext_resource connections across the example project text resources', async () => {
      const resourceFiles = [
        'resources/enemy_spawn_config.tres',
        'scenes/main.tscn',
      ].filter(filePath => fs.existsSync(path.join(workspaceRoot, filePath)));

      const allConnections: Array<{ from: string; to: string }> = [];

      for (const relPath of resourceFiles) {
        const absPath = path.join(workspaceRoot, relPath);
        const content = fs.readFileSync(absPath, 'utf-8');
        const connections = (await plugin.analyzeFile(absPath, content, workspaceRoot)).relations ?? [];

        for (const conn of connections) {
          if (conn.resolvedPath) {
            const toRel = path.relative(workspaceRoot, conn.resolvedPath).replace(/\\/g, '/');
            allConnections.push({ from: relPath, to: toRel });
          }
        }
      }

      expect(allConnections).toEqual(
        expect.arrayContaining([
          { from: 'resources/enemy_spawn_config.tres', to: 'scripts/data/spawn_config.gd' },
          { from: 'scenes/main.tscn', to: 'scenes/player.tscn' },
          { from: 'scenes/main.tscn', to: 'scenes/enemy.tscn' },
          { from: 'scenes/main.tscn', to: 'scripts/spawning/enemy_spawner.gd' },
        ]),
      );
    });
});
