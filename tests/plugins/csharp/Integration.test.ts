/**
 * @fileoverview Integration tests for C# plugin.
 * Simulates how WorkspaceAnalyzer calls the plugin to verify edge detection.
 * 
 * The key difference from Python: C# uses namespaces that need to be
 * registered across files before resolution can work.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { createCSharpPlugin } from '../../../src/plugins/csharp';
import { IConnection } from '../../../src/core/plugins/types';

const CSHARP_EXAMPLE_ROOT = path.join(__dirname, '../../../examples/csharp-plugin');

describe('C# Plugin Integration', () => {
  const csharpPlugin = createCSharpPlugin();
  const workspaceRoot = CSHARP_EXAMPLE_ROOT;

  beforeAll(async () => {
    await csharpPlugin.initialize?.(workspaceRoot);
  });

  /**
   * This test simulates exactly what WorkspaceAnalyzer does:
   * 1. Calls detectConnections with ABSOLUTE file path
   * 2. Gets resolvedPath from connections
   * 3. Calls path.relative(workspaceRoot, resolvedPath) to get the node ID
   */
  it('should return absolute resolvedPath', async () => {
    const programCs = path.join(workspaceRoot, 'src', 'Program.cs');
    const content = fs.readFileSync(programCs, 'utf-8');

    const connections = await csharpPlugin.detectConnections(
      programCs,
      content,
      workspaceRoot
    );

    expect(connections.length).toBeGreaterThan(0);
    
    // Find non-external connections (skip System namespace)
    const internalConnections = connections.filter(c => 
      c.resolvedPath !== null && 
      !c.specifier.includes('System')
    );

    // At minimum, we should resolve MyApp.Services and MyApp.Utils
    // But since namespaces aren't registered yet, this might be 0 initially
    // The fix should make this work via convention-based resolution
    for (const conn of internalConnections) {
      expect(conn.resolvedPath).not.toBeNull();
      
      // Verify path is absolute
      expect(path.isAbsolute(conn.resolvedPath!)).toBe(true);
      
      // This is what WorkspaceAnalyzer does to build edges
      const targetRelative = path.relative(workspaceRoot, conn.resolvedPath!);
      
      // The path should NOT start with '..' because it's under workspaceRoot
      expect(targetRelative).not.toMatch(/^\.\./);
    }
  });

  it('should detect edges for all imports in the example project', async () => {
    // Collect all .cs files
    const csFiles = [
      'src/Program.cs',
      'src/Config.cs',
      'src/Orphan.cs',
      'src/Services/ApiService.cs',
      'src/Utils/Helpers.cs',
      'src/Utils/Formatter.cs',
    ];

    // IMPORTANT: C# requires two passes - first to register namespaces,
    // then to resolve usings. Let's simulate what the plugin should do.
    
    // Pass 1: Register all namespaces by calling detectConnections on all files
    for (const relPath of csFiles) {
      const absPath = path.join(workspaceRoot, relPath);
      if (!fs.existsSync(absPath)) continue;
      
      const content = fs.readFileSync(absPath, 'utf-8');
      // This registers namespaces as a side effect
      await csharpPlugin.detectConnections(absPath, content, workspaceRoot);
    }

    // Pass 2: Now collect all connections (namespaces are registered)
    const allConnections: Array<{ from: string; to: string | null; specifier: string }> = [];

    for (const relPath of csFiles) {
      const absPath = path.join(workspaceRoot, relPath);
      if (!fs.existsSync(absPath)) continue;

      const content = fs.readFileSync(absPath, 'utf-8');
      const connections = await csharpPlugin.detectConnections(absPath, content, workspaceRoot);

      for (const conn of connections) {
        if (conn.resolvedPath) {
          // Simulate what WorkspaceAnalyzer does
          const targetRelative = path.relative(workspaceRoot, conn.resolvedPath);
          // Normalize slashes for cross-platform comparison
          const normalized = targetRelative.replace(/\\/g, '/');
          allConnections.push({ from: relPath, to: normalized, specifier: conn.specifier });
        } else {
          // Track unresolved too for debugging
          allConnections.push({ from: relPath, to: null, specifier: conn.specifier });
        }
      }
    }

    console.log('All C# connections:', allConnections);

    // Filter out external dependencies (System, etc.) and bogus paths
    const validEdges = allConnections.filter(
      e => e.to && !e.to.startsWith('..') && csFiles.includes(e.to)
    );

    console.log('Valid C# edges:', validEdges);

    // We expect at least these edges after namespace registration:
    // - Program.cs -> Services/ApiService.cs (via MyApp.Services)
    // - Program.cs -> Utils/Helpers.cs (via MyApp.Utils) or Utils/Formatter.cs
    // - Services/ApiService.cs -> Utils/Helpers.cs (via MyApp.Utils)
    // - Utils/Helpers.cs -> Utils/Formatter.cs (direct usage, same namespace)
    
    expect(validEdges.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle convention-based resolution without pre-registered namespaces', async () => {
    // Create a fresh plugin instance to test convention-based resolution alone
    const freshPlugin = createCSharpPlugin();
    await freshPlugin.initialize?.(workspaceRoot);

    const programCs = path.join(workspaceRoot, 'src', 'Program.cs');
    const content = fs.readFileSync(programCs, 'utf-8');

    // On first call, no namespaces are registered yet
    // The convention-based resolver should still find files
    const connections = await freshPlugin.detectConnections(programCs, content, workspaceRoot);

    console.log('Fresh plugin connections:', connections.map(c => ({
      specifier: c.specifier,
      resolved: c.resolvedPath ? path.relative(workspaceRoot, c.resolvedPath) : null
    })));

    // Even without namespace registration, convention-based resolution
    // should find at least some files
    const resolved = connections.filter(c => 
      c.resolvedPath !== null && 
      !c.specifier.includes('System')
    );

    // This is the key test - convention resolution should work
    expect(resolved.length).toBeGreaterThan(0);
  });
});
