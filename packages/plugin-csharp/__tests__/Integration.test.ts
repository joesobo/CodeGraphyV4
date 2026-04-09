/**
 * @fileoverview Integration tests for C# plugin.
 * Simulates how the pipeline calls the plugin to verify edge detection.
 * 
 * The key difference from Python: C# uses namespaces that need to be
 * registered across files before resolution can work.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { createCSharpPlugin, type ICSharpAnalyzeFilePlugin } from '../src/plugin';

const CSHARP_EXAMPLE_ROOT = path.join(__dirname, '../examples');

describe('C# Plugin Integration', () => {
  const csharpPlugin = createCSharpPlugin() as ICSharpAnalyzeFilePlugin;
  const workspaceRoot = CSHARP_EXAMPLE_ROOT;

  beforeAll(async () => {
    await csharpPlugin.initialize?.(workspaceRoot);
  });

  /**
   * This test simulates exactly what the pipeline does:
   * 1. Calls analyzeFile with ABSOLUTE file path
   * 2. Gets resolvedPath from connections
   * 3. Calls path.relative(workspaceRoot, resolvedPath) to get the node ID
   */
  it('should return absolute toFilePath values from analyzeFile relations', async () => {
    const programCs = path.join(workspaceRoot, 'src', 'Program.cs');
    const content = fs.readFileSync(programCs, 'utf-8');

    const analysis = await csharpPlugin.analyzeFile(
      programCs,
      content,
      workspaceRoot
    );

    expect(analysis.relations.length).toBeGreaterThan(0);
    
    const internalRelations = analysis.relations.filter((relation) => 
      relation.toFilePath !== null &&
      !relation.specifier.includes('System')
    );

    for (const relation of internalRelations) {
      expect(relation.toFilePath).not.toBeNull();
      
      expect(path.isAbsolute(relation.toFilePath!)).toBe(true);
      
      const targetRelative = path.relative(workspaceRoot, relation.toFilePath!);
      
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

    // Pass 1: register namespaces by analyzing all files once.
    for (const relPath of csFiles) {
      const absPath = path.join(workspaceRoot, relPath);
      if (!fs.existsSync(absPath)) continue;
      
      const content = fs.readFileSync(absPath, 'utf-8');
      await csharpPlugin.analyzeFile(absPath, content, workspaceRoot);
    }

    // Pass 2: collect file-analysis relations with the populated namespace map.
    const allConnections: Array<{ from: string; to: string | null; specifier: string }> = [];

    for (const relPath of csFiles) {
      const absPath = path.join(workspaceRoot, relPath);
      if (!fs.existsSync(absPath)) continue;

      const content = fs.readFileSync(absPath, 'utf-8');
      const analysis = await csharpPlugin.analyzeFile(absPath, content, workspaceRoot);

      for (const relation of analysis.relations) {
        if (relation.toFilePath) {
          const targetRelative = path.relative(workspaceRoot, relation.toFilePath);
          // Normalize slashes for cross-platform comparison
          const normalized = targetRelative.replace(/\\/g, '/');
          allConnections.push({ from: relPath, to: normalized, specifier: relation.specifier });
        } else {
          allConnections.push({ from: relPath, to: null, specifier: relation.specifier });
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
    const analysis = await (freshPlugin as ICSharpAnalyzeFilePlugin).analyzeFile(
      programCs,
      content,
      workspaceRoot,
    );

    console.log('Fresh plugin connections:', analysis.relations.map((relation) => ({
      specifier: relation.specifier,
      resolved: relation.toFilePath ? path.relative(workspaceRoot, relation.toFilePath) : null
    })));

    // Even without namespace registration, convention-based resolution
    // should find at least some files
    const resolved = analysis.relations.filter((relation) => 
      relation.toFilePath !== null &&
      !relation.specifier.includes('System')
    );

    // This is the key test - convention resolution should work
    expect(resolved.length).toBeGreaterThan(0);
  });
});
