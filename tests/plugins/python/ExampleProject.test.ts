/**
 * @fileoverview Tests for Python plugin using example project.
 * Tests that the example project files are correctly analyzed.
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { createPythonPlugin } from '../../../src/plugins/python';

const EXAMPLE_ROOT = path.join(__dirname, '../../../examples/python-plugin');

describe('Python Example Project', () => {
  const plugin = createPythonPlugin();

  // Initialize plugin before tests
  beforeAll(async () => {
    await plugin.initialize?.(EXAMPLE_ROOT);
  });

  // Helper to read file and detect connections
  async function getConnections(relPath: string) {
    const fullPath = path.join(EXAMPLE_ROOT, relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    return plugin.detectConnections(fullPath, content, EXAMPLE_ROOT);
  }

  // Helper to get workspace-relative resolved path
  function toRelative(absolutePath: string | null): string | null {
    if (absolutePath === null) return null;
    return path.relative(EXAMPLE_ROOT, absolutePath).replace(/\\/g, '/');
  }

  describe('main.py imports', () => {
    it('should detect 3 imports in main.py', async () => {
      const connections = await getConnections('src/main.py');
      expect(connections).toHaveLength(3);
    });

    it('should resolve "import config" to src/config.py', async () => {
      const connections = await getConnections('src/main.py');
      const configConn = connections.find(c => c.specifier === 'config');
      expect(configConn).toBeDefined();

      const resolved = toRelative(configConn!.resolvedPath);
      expect(resolved).toBe('src/config.py');
    });

    it('should resolve "from services.api import fetch_data" to src/services/api.py', async () => {
      const connections = await getConnections('src/main.py');
      const apiConn = connections.find(c => c.specifier.includes('services.api'));
      expect(apiConn).toBeDefined();

      const resolved = toRelative(apiConn!.resolvedPath);
      expect(resolved).toBe('src/services/api.py');
    });

    it('should resolve "from utils.helpers import process_data" to src/utils/helpers.py', async () => {
      const connections = await getConnections('src/main.py');
      const helpersConn = connections.find(c => c.specifier.includes('utils.helpers'));
      expect(helpersConn).toBeDefined();

      const resolved = toRelative(helpersConn!.resolvedPath);
      expect(resolved).toBe('src/utils/helpers.py');
    });
  });

  describe('services/api.py imports', () => {
    it('should detect import in api.py', async () => {
      const connections = await getConnections('src/services/api.py');
      expect(connections.length).toBeGreaterThan(0);
    });

    it('should resolve "from utils.helpers import process_data" to src/utils/helpers.py', async () => {
      const connections = await getConnections('src/services/api.py');
      const helpersConn = connections.find(c => c.specifier.includes('utils.helpers'));
      expect(helpersConn).toBeDefined();

      const resolved = toRelative(helpersConn!.resolvedPath);
      expect(resolved).toBe('src/utils/helpers.py');
    });
  });

  describe('utils/helpers.py imports', () => {
    it('should detect import in helpers.py', async () => {
      const connections = await getConnections('src/utils/helpers.py');
      expect(connections.length).toBeGreaterThan(0);
    });

    it('should resolve "from utils.format import format_output" to src/utils/format.py', async () => {
      const connections = await getConnections('src/utils/helpers.py');
      const formatConn = connections.find(c => c.specifier.includes('utils.format'));
      expect(formatConn).toBeDefined();

      const resolved = toRelative(formatConn!.resolvedPath);
      expect(resolved).toBe('src/utils/format.py');
    });
  });
});
