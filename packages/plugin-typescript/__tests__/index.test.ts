/**
 * @fileoverview Integration tests for the TypeScript plugin.
 * Uses the example TypeScript project in src/plugins/typescript/examples to verify
 * that the plugin detects connections end-to-end, matching what
 * WorkspaceAnalyzer would produce.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { createTypeScriptPlugin } from '../src';

const TS_EXAMPLE_ROOT = path.join(__dirname, '../examples');

describe('createTypeScriptPlugin manifest', () => {
  it('should expose the plugin id from codegraphy.json', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.id).toBe('codegraphy.typescript');
  });

  it('should expose the plugin name', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.name).toBeTruthy();
  });

  it('should expose the plugin version', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.version).toBeTruthy();
  });

  it('should expose the apiVersion', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.apiVersion).toBeTruthy();
  });

  it('should support TypeScript and JavaScript extensions', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.supportedExtensions).toContain('.ts');
    expect(plugin.supportedExtensions).toContain('.tsx');
    expect(plugin.supportedExtensions).toContain('.js');
    expect(plugin.supportedExtensions).toContain('.jsx');
  });

  it('should expose rules from manifest', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.rules).toBeDefined();
    expect(plugin.rules!.length).toBe(4);
  });

  it('should expose fileColors from manifest', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.fileColors).toBeDefined();
  });

  it('should expose defaultFilters from manifest', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.defaultFilters).toBeDefined();
    expect(plugin.defaultFilters).toContain('**/node_modules/**');
  });
});

describe('createTypeScriptPlugin lifecycle', () => {
  const workspaceRoot = TS_EXAMPLE_ROOT;

  it('should initialize without error', async () => {
    const plugin = createTypeScriptPlugin();
    await plugin.initialize?.(workspaceRoot);
  });

  it('should create resolver during initialize', async () => {
    const plugin = createTypeScriptPlugin();
    await plugin.initialize?.(workspaceRoot);

    // After initialize, resolver exists, so detectConnections works with imports
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    expect(connections.length).toBeGreaterThan(0);
  });

  it('should lazy-initialize resolver if not initialized', async () => {
    const plugin = createTypeScriptPlugin();
    // Do NOT call initialize — go straight to detectConnections
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    expect(connections.length).toBeGreaterThan(0);
  });

  it('should handle detectConnections without prior initialize', async () => {
    const plugin = createTypeScriptPlugin();
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'src', 'config.ts'),
      fs.readFileSync(path.join(workspaceRoot, 'src', 'config.ts'), 'utf-8'),
      workspaceRoot
    );
    expect(connections).toEqual([]);
  });

  it('should reset resolver on unload', async () => {
    const plugin = createTypeScriptPlugin();
    await plugin.initialize?.(workspaceRoot);
    plugin.onUnload?.();
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'src', 'config.ts'),
      fs.readFileSync(path.join(workspaceRoot, 'src', 'config.ts'), 'utf-8'),
      workspaceRoot
    );
    expect(connections).toEqual([]);
  });

  it('should re-create resolver after unload when detectConnections is called', async () => {
    const plugin = createTypeScriptPlugin();
    await plugin.initialize?.(workspaceRoot);
    plugin.onUnload?.();

    // Now calling detectConnections should lazy-init a new resolver
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    expect(connections.length).toBeGreaterThan(0);
  });
});

describe('rule identification', () => {
  const plugin = createTypeScriptPlugin();
  const workspaceRoot = TS_EXAMPLE_ROOT;

  beforeAll(async () => {
    await plugin.initialize?.(workspaceRoot);
  });

  it('sets es6-import ruleId for static imports', async () => {
    const content = `import { foo } from './bar';`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].ruleId).toBe('es6-import');
  });

  it('sets dynamic-import ruleId for dynamic imports', async () => {
    const content = `const mod = import('./bar');`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].ruleId).toBe('dynamic-import');
  });

  it('sets commonjs-require ruleId for require calls', async () => {
    const content = `const foo = require('./bar');`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].ruleId).toBe('commonjs-require');
  });

  it('sets reexport ruleId for re-exports', async () => {
    const content = `export { foo } from './bar';`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].ruleId).toBe('reexport');
  });

  it('every connection has a ruleId set', async () => {
    const content = `
      import { a } from './a';
      const b = require('./b');
      export { c } from './c';
      const d = import('./d');
    `;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    for (const conn of connections) {
      expect(conn.ruleId).toBeDefined();
      expect(typeof conn.ruleId).toBe('string');
    }
  });
});

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
      .filter(conn => conn.resolvedPath !== null)
      .map(conn => path.relative(workspaceRoot, conn.resolvedPath!).replace(/\\/g, '/'));

    expect(resolvedRels).toContain('src/config.ts');
  });

  it('returns absolute resolvedPaths for all resolved connections', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    for (const conn of connections.filter(connection => connection.resolvedPath !== null)) {
      expect(path.isAbsolute(conn.resolvedPath!)).toBe(true);
    }
  });

  it('config.ts has no outgoing connections (it imports nothing)', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'config.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    const resolved = connections.filter(conn => conn.resolvedPath !== null);
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
    ].filter(filePath => fs.existsSync(path.join(workspaceRoot, filePath)));

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

  it('resolves tsconfig path aliases with slash patterns (e.g. "@/*", "@components/*")', async () => {
    const filePath = path.join(workspaceRoot, 'src', 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);
    const resolvedRels = connections
      .filter(conn => conn.resolvedPath !== null)
      .map(conn => path.relative(workspaceRoot, conn.resolvedPath!).replace(/\\/g, '/'));

    expect(resolvedRels).toContain('src/components/App.tsx');
    expect(resolvedRels).toContain('src/services/api.ts');
  });
});
