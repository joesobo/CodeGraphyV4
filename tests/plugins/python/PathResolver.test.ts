/**
 * @fileoverview Tests for Python PathResolver.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PathResolver } from '../../../src/plugins/python/PathResolver';
import { IDetectedImport } from '../../../src/plugins/python/ImportDetector';

// Mock fs module
vi.mock('fs');

describe('Python PathResolver', () => {
  const workspaceRoot = '/workspace';
  let resolver: PathResolver;
  let existingFiles: Set<string>;

  beforeEach(() => {
    resolver = new PathResolver(workspaceRoot);
    existingFiles = new Set();

    // Mock fs.existsSync
    vi.mocked(fs.existsSync).mockImplementation((filePath) => {
      // Normalize path for comparison
      const normalizedPath = String(filePath).replace(/\\/g, '/');
      return existingFiles.has(normalizedPath);
    });

    // Mock fs.statSync to return file stats
    vi.mocked(fs.statSync).mockImplementation(() => ({
      isFile: () => true,
    }) as fs.Stats);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function addFile(relativePath: string): void {
    // Add both forward-slash and platform-native versions
    const normalizedRelative = relativePath.replace(/\\/g, '/');
    const fullPath = `${workspaceRoot}/${normalizedRelative}`;
    existingFiles.add(fullPath);
    
    // Also add with path.join for platform compatibility
    const nativePath = path.join(workspaceRoot, relativePath);
    existingFiles.add(nativePath.replace(/\\/g, '/'));
  }

  function createImport(overrides: Partial<IDetectedImport>): IDetectedImport {
    return {
      module: '',
      isRelative: false,
      relativeLevel: 0,
      type: 'import',
      line: 1,
      ...overrides,
    };
  }

  /**
   * Helper to get expected absolute path (platform-independent comparison).
   * PathResolver now returns absolute paths for consistency with TypeScript plugin.
   */
  function expectAbsPath(relativePath: string): string {
    return path.join(workspaceRoot, relativePath);
  }

  describe('absolute imports', () => {
    it('should resolve simple module to .py file', () => {
      addFile('utils.py');
      
      const imp = createImport({ module: 'utils' });
      const resolved = resolver.resolve(imp, 'main.py');
      
      expect(resolved).toBe(expectAbsPath('utils.py'));
    });

    it('should resolve dotted module path', () => {
      addFile('mypackage/utils.py');
      
      const imp = createImport({ module: 'mypackage.utils' });
      const resolved = resolver.resolve(imp, 'main.py');
      
      expect(resolved).toBe(expectAbsPath('mypackage/utils.py'));
    });

    it('should resolve deeply nested module', () => {
      addFile('mypackage/subpackage/module.py');
      
      const imp = createImport({ module: 'mypackage.subpackage.module' });
      const resolved = resolver.resolve(imp, 'main.py');
      
      expect(resolved).toBe(expectAbsPath('mypackage/subpackage/module.py'));
    });

    it('should resolve package with __init__.py', () => {
      addFile('mypackage/__init__.py');
      
      const imp = createImport({ module: 'mypackage' });
      const resolved = resolver.resolve(imp, 'main.py');
      
      expect(resolved).toBe(expectAbsPath('mypackage/__init__.py'));
    });

    it('should prefer .py over __init__.py', () => {
      addFile('utils.py');
      addFile('utils/__init__.py');
      
      const imp = createImport({ module: 'utils' });
      const resolved = resolver.resolve(imp, 'main.py');
      
      expect(resolved).toBe(expectAbsPath('utils.py'));
    });

    it('should try common source directories', () => {
      addFile('src/mymodule.py');
      
      const imp = createImport({ module: 'mymodule' });
      const resolved = resolver.resolve(imp, 'main.py');
      
      expect(resolved).toBe(expectAbsPath('src/mymodule.py'));
    });

    it('should return null for unresolved module', () => {
      const imp = createImport({ module: 'nonexistent' });
      const resolved = resolver.resolve(imp, 'main.py');
      
      expect(resolved).toBeNull();
    });

    it('should resolve .pyi stub files', () => {
      addFile('types.pyi');
      
      const imp = createImport({ module: 'types' });
      const resolved = resolver.resolve(imp, 'main.py');
      
      expect(resolved).toBe(expectAbsPath('types.pyi'));
    });
  });

  describe('relative imports', () => {
    it('should resolve single dot import', () => {
      // from . import utils (in same directory)
      addFile('package/utils.py');
      
      const imp = createImport({
        module: 'utils',
        isRelative: true,
        relativeLevel: 1,
        type: 'from',
      });
      const resolved = resolver.resolve(imp, 'package/main.py');
      
      expect(resolved).toBe(expectAbsPath('package/utils.py'));
    });

    it('should resolve double dot import', () => {
      // from .. import helpers (go up one level from current file's dir)
      // From package/subpackage/main.py, .. goes to package/, so ..helpers = package/helpers.py
      addFile('package/helpers.py');
      
      const imp = createImport({
        module: 'helpers',
        isRelative: true,
        relativeLevel: 2,
        type: 'from',
      });
      const resolved = resolver.resolve(imp, 'package/subpackage/main.py');
      
      expect(resolved).toBe(expectAbsPath('package/helpers.py'));
    });

    it('should resolve parent package import', () => {
      // from .. import config (from package/main.py, goes to root)
      addFile('config.py');
      
      const imp = createImport({
        module: 'config',
        isRelative: true,
        relativeLevel: 2,
        type: 'from',
      });
      const resolved = resolver.resolve(imp, 'package/main.py');
      
      expect(resolved).toBe(expectAbsPath('config.py'));
    });

    it('should resolve relative import with nested module', () => {
      // from .utils import helpers -> package/utils/helpers.py
      addFile('package/utils/helpers.py');
      
      const imp = createImport({
        module: 'utils.helpers',
        isRelative: true,
        relativeLevel: 1,
        type: 'from',
      });
      const resolved = resolver.resolve(imp, 'package/main.py');
      
      expect(resolved).toBe(expectAbsPath('package/utils/helpers.py'));
    });

    it('should resolve from . import (same directory)', () => {
      // from . import sibling (from package/current.py, gets package/sibling.py)
      addFile('package/sibling.py');
      
      const imp = createImport({
        module: 'sibling',
        isRelative: true,
        relativeLevel: 1,
        type: 'from',
      });
      const resolved = resolver.resolve(imp, 'package/current.py');
      
      expect(resolved).toBe(expectAbsPath('package/sibling.py'));
    });

    it('should resolve package __init__ for relative import', () => {
      // from .subpackage import ... -> package/subpackage/__init__.py
      addFile('package/subpackage/__init__.py');
      
      const imp = createImport({
        module: 'subpackage',
        isRelative: true,
        relativeLevel: 1,
        type: 'from',
      });
      const resolved = resolver.resolve(imp, 'package/main.py');
      
      expect(resolved).toBe(expectAbsPath('package/subpackage/__init__.py'));
    });
  });

  describe('edge cases', () => {
    it('should handle absolute file path input', () => {
      addFile('utils.py');
      
      const imp = createImport({ module: 'utils' });
      const resolved = resolver.resolve(imp, '/workspace/main.py');
      
      expect(resolved).toBe(expectAbsPath('utils.py'));
    });

    it('should handle Windows-style paths', () => {
      addFile('mypackage/utils.py');
      
      const imp = createImport({ module: 'mypackage.utils' });
      const resolved = resolver.resolve(imp, 'src\\main.py');
      
      expect(resolved).toBe(expectAbsPath('mypackage/utils.py'));
    });

    it('should handle empty module in relative import', () => {
      // from .. import something (go to parent package)
      addFile('package/__init__.py');
      
      const imp = createImport({
        module: '',
        isRelative: true,
        relativeLevel: 2, // .. = parent directory
        type: 'from',
        names: ['something'],
      });
      const resolved = resolver.resolve(imp, 'package/subpackage/main.py');
      
      // Should resolve to the parent package's __init__.py
      expect(resolved).toBe(expectAbsPath('package/__init__.py'));
    });
  });

  describe('source roots', () => {
    it('should resolve from custom source roots', () => {
      const resolverWithRoots = new PathResolver(workspaceRoot, {
        sourceRoots: ['lib', 'vendor'],
      });
      
      addFile('lib/external.py');
      
      const imp = createImport({ module: 'external' });
      const resolved = resolverWithRoots.resolve(imp, 'main.py');
      
      expect(resolved).toBe(expectAbsPath('lib/external.py'));
    });
  });
});
