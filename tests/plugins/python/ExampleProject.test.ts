/**
 * @fileoverview Tests for Python plugin using example project.
 * Tests that the example project files are correctly analyzed.
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { ImportDetector } from '../../../src/plugins/python/ImportDetector';
import { PathResolver } from '../../../src/plugins/python/PathResolver';

const EXAMPLE_ROOT = path.join(__dirname, '../../../examples/python-plugin');

describe('Python Example Project', () => {
  const detector = new ImportDetector();
  const resolver = new PathResolver(EXAMPLE_ROOT);

  // Helper to read file and detect imports
  function getImports(relPath: string) {
    const fullPath = path.join(EXAMPLE_ROOT, relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    return detector.detect(content);
  }

  // Helper to resolve import from a file and return the workspace-relative path
  // (for easier test comparison)
  function resolveImport(imp: ReturnType<typeof detector.detect>[0], fromFile: string) {
    const absolutePath = resolver.resolve(imp, fromFile);
    if (absolutePath === null) return null;
    // Convert absolute path to workspace-relative for comparison
    return path.relative(EXAMPLE_ROOT, absolutePath).replace(/\\/g, '/');
  }

  describe('main.py imports', () => {
    const mainImports = getImports('src/main.py');

    it('should detect 3 imports in main.py', () => {
      expect(mainImports).toHaveLength(3);
    });

    it('should resolve "import config" to src/config.py', () => {
      const configImport = mainImports.find(i => i.module === 'config');
      expect(configImport).toBeDefined();
      
      const resolved = resolveImport(configImport!, 'src/main.py');
      expect(resolved).toBe('src/config.py');
    });

    it('should resolve "from services.api import fetch_data" to src/services/api.py', () => {
      const apiImport = mainImports.find(i => i.module === 'services.api');
      expect(apiImport).toBeDefined();
      
      const resolved = resolveImport(apiImport!, 'src/main.py');
      expect(resolved).toBe('src/services/api.py');
    });

    it('should resolve "from utils.helpers import process_data" to src/utils/helpers.py', () => {
      const helpersImport = mainImports.find(i => i.module === 'utils.helpers');
      expect(helpersImport).toBeDefined();
      
      const resolved = resolveImport(helpersImport!, 'src/main.py');
      expect(resolved).toBe('src/utils/helpers.py');
    });
  });

  describe('services/api.py imports', () => {
    const apiImports = getImports('src/services/api.py');

    it('should detect import in api.py', () => {
      expect(apiImports.length).toBeGreaterThan(0);
    });

    it('should resolve "from utils.helpers import process_data" to src/utils/helpers.py', () => {
      const helpersImport = apiImports.find(i => i.module === 'utils.helpers');
      expect(helpersImport).toBeDefined();
      
      const resolved = resolveImport(helpersImport!, 'src/services/api.py');
      expect(resolved).toBe('src/utils/helpers.py');
    });
  });

  describe('utils/helpers.py imports', () => {
    const helperImports = getImports('src/utils/helpers.py');

    it('should detect import in helpers.py', () => {
      expect(helperImports.length).toBeGreaterThan(0);
    });

    it('should resolve "from utils.format import format_output" to src/utils/format.py', () => {
      const formatImport = helperImports.find(i => i.module === 'utils.format');
      expect(formatImport).toBeDefined();
      
      const resolved = resolveImport(formatImport!, 'src/utils/helpers.py');
      expect(resolved).toBe('src/utils/format.py');
    });
  });
});
