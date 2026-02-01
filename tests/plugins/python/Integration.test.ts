/**
 * @fileoverview Integration tests for Python plugin.
 * Simulates how WorkspaceAnalyzer calls the plugin to reproduce the 0 edges bug.
 * 
 * Bug: Python PathResolver returns workspace-relative paths, but
 * WorkspaceAnalyzer expects absolute paths (like TypeScript plugin).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { createPythonPlugin } from '../../../src/plugins/python';
import { createTypeScriptPlugin } from '../../../src/plugins/typescript';
import { IConnection } from '../../../src/core/plugins/types';

const PYTHON_EXAMPLE_ROOT = path.join(__dirname, '../../../examples/python-plugin');

describe('Python Plugin Integration (reproduces 0 edges bug)', () => {
  const pythonPlugin = createPythonPlugin();
  const workspaceRoot = PYTHON_EXAMPLE_ROOT;

  beforeAll(async () => {
    await pythonPlugin.initialize?.(workspaceRoot);
  });

  /**
   * This test simulates exactly what WorkspaceAnalyzer does:
   * 1. Calls detectConnections with ABSOLUTE file path
   * 2. Gets resolvedPath from connections
   * 3. Calls path.relative(workspaceRoot, resolvedPath) to get the node ID
   * 
   * BUG: Python plugin returns relative paths, so path.relative() produces garbage.
   */
  it('should return absolute resolvedPath (like TypeScript plugin does)', async () => {
    const mainPy = path.join(workspaceRoot, 'src', 'main.py');
    const content = fs.readFileSync(mainPy, 'utf-8');

    // This is exactly what WorkspaceAnalyzer does
    const connections = await pythonPlugin.detectConnections(
      mainPy, // absolute path
      content,
      workspaceRoot
    );

    expect(connections.length).toBeGreaterThan(0);
    
    // The bug: resolvedPath should be absolute, but Python plugin returns relative
    const configConnection = connections.find(c => c.specifier.includes('config'));
    expect(configConnection).toBeDefined();
    expect(configConnection!.resolvedPath).not.toBeNull();

    // This is what WorkspaceAnalyzer does to build edges
    const resolvedPath = configConnection!.resolvedPath!;
    const targetRelative = path.relative(workspaceRoot, resolvedPath);

    // If resolvedPath is relative (the bug), path.relative produces garbage like:
    // path.relative('C:/foo/bar', 'src/config.py') => '../../../src/config.py'
    // 
    // If resolvedPath is absolute (correct), path.relative produces:
    // path.relative('C:/foo/bar', 'C:/foo/bar/src/config.py') => 'src/config.py'
    
    // The test: targetRelative should NOT start with '..' 
    // because config.py IS under workspaceRoot
    expect(targetRelative).not.toMatch(/^\.\./);
    
    // Normalize slashes for cross-platform comparison
    const normalized = targetRelative.replace(/\\/g, '/');
    expect(normalized).toBe('src/config.py');
  });

  it('should detect edges for all imports in the example project', async () => {
    // Collect all .py files
    const pyFiles = [
      'src/main.py',
      'src/config.py',
      'src/orphan.py',
      'src/services/api.py',
      'src/services/__init__.py',
      'src/utils/helpers.py',
      'src/utils/format.py',
      'src/utils/__init__.py',
    ];

    const allConnections: Array<{ from: string; to: string | null }> = [];

    for (const relPath of pyFiles) {
      const absPath = path.join(workspaceRoot, relPath);
      if (!fs.existsSync(absPath)) continue;

      const content = fs.readFileSync(absPath, 'utf-8');
      const connections = await pythonPlugin.detectConnections(absPath, content, workspaceRoot);

      for (const conn of connections) {
        if (conn.resolvedPath) {
          // Simulate what WorkspaceAnalyzer does
          const targetRelative = path.relative(workspaceRoot, conn.resolvedPath);
          // Normalize slashes for cross-platform comparison
          const normalized = targetRelative.replace(/\\/g, '/');
          allConnections.push({ from: relPath, to: normalized });
        }
      }
    }

    console.log('Detected edges:', allConnections);

    // We expect at least these edges:
    // - main.py -> config.py
    // - main.py -> services/api.py
    // - main.py -> utils/helpers.py
    // - services/api.py -> utils/helpers.py
    // - utils/helpers.py -> utils/format.py
    // Plus __init__.py relative imports

    // Filter out bogus paths (the bug produces paths like '../../../src/config.py')
    const validEdges = allConnections.filter(
      e => e.to && !e.to.startsWith('..') && pyFiles.includes(e.to)
    );

    console.log('Valid edges:', validEdges);

    // With the bug, this will be 0 because all paths start with '..'
    expect(validEdges.length).toBeGreaterThanOrEqual(5);
  });

  /**
   * Compare with TypeScript plugin to show expected behavior.
   */
  it('TypeScript plugin returns absolute paths (reference behavior)', async () => {
    const tsPlugin = createTypeScriptPlugin();
    
    // Create a minimal TS file to test with
    const tsContent = `import { something } from './other';`;
    const mockTsFile = path.join(workspaceRoot, 'test.ts');
    const mockOtherFile = path.join(workspaceRoot, 'other.ts');
    
    // Write temp files
    fs.writeFileSync(mockTsFile, tsContent);
    fs.writeFileSync(mockOtherFile, 'export const something = 1;');
    
    try {
      await tsPlugin.initialize?.(workspaceRoot);
      const connections = await tsPlugin.detectConnections(mockTsFile, tsContent, workspaceRoot);
      
      expect(connections.length).toBe(1);
      expect(connections[0].resolvedPath).not.toBeNull();
      
      // TypeScript returns absolute path
      expect(path.isAbsolute(connections[0].resolvedPath!)).toBe(true);
      
      // path.relative works correctly
      const targetRelative = path.relative(workspaceRoot, connections[0].resolvedPath!);
      expect(targetRelative).toBe('other.ts');
    } finally {
      // Cleanup
      fs.unlinkSync(mockTsFile);
      fs.unlinkSync(mockOtherFile);
    }
  });
});
