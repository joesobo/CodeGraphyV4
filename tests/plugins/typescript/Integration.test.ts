/**
 * @fileoverview Integration tests for the TypeScript plugin.
 * Uses the example TypeScript project in examples/ts-plugin to verify
 * that the plugin detects connections end-to-end, matching what
 * WorkspaceAnalyzer would produce.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { createTypeScriptPlugin } from '../../../src/plugins/typescript';

const TS_EXAMPLE_ROOT = path.join(__dirname, '../../../examples/ts-plugin');

describe('TypeScript Plugin Integration', () => {
  const plugin = createTypeScriptPlugin();
  const workspaceRoot = TS_EXAMPLE_ROOT;

  beforeAll(async () => {
    await plugin.initialize?.(workspaceRoot);
  });

  it('detects imports in index.ts', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    expect(connections.length).toBeGreaterThan(0);
  });

  it('resolves relative import from index.ts to config.ts', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    const resolvedRels = connections
      .filter(c => c.resolvedPath !== null)
      .map(c => path.relative(workspaceRoot, c.resolvedPath!).replace(/\\/g, '/'));

    expect(resolvedRels).toContain('src/config.ts');
  });

  it('returns absolute resolvedPaths for all resolved connections', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    for (const conn of connections.filter(c => c.resolvedPath !== null)) {
      expect(path.isAbsolute(conn.resolvedPath!)).toBe(true);
    }
  });

  it('config.ts has no outgoing connections (it imports nothing)', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'config.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    const resolved = connections.filter(c => c.resolvedPath !== null);
    expect(resolved.length).toBe(0);
  });

  it('builds a complete edge graph across the example project', async () => {
    const tsFiles = [
      'src/index.ts',
      'src/config.ts',
      'src/orphan.ts',
      'src/services/api.ts',
      'src/utils/helpers.ts',
      'src/utils/format.ts',
      'src/utils/styles.ts',
    ].filter(f => fs.existsSync(path.join(workspaceRoot, f)));

    const edges: Array<{ from: string; to: string }> = [];

    for (const relPath of tsFiles) {
      const absPath = path.join(workspaceRoot, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');
      const connections = await plugin.detectConnections(absPath, content, workspaceRoot);

      for (const conn of connections) {
        if (conn.resolvedPath) {
          const toRel = path.relative(workspaceRoot, conn.resolvedPath).replace(/\\/g, '/');
          if (tsFiles.includes(toRel)) {
            edges.push({ from: relPath, to: toRel });
          }
        }
      }
    }

    // index.ts must have at least one edge (to config.ts)
    expect(edges.some(e => e.from === 'src/index.ts')).toBe(true);
    expect(edges.some(e => e.to === 'src/config.ts')).toBe(true);
  });
});
