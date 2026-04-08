/**
 * @fileoverview Tests for Python plugin using example project.
 * Tests that the example project files are correctly analyzed.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { createPythonPlugin } from '../src/plugin';

const EXAMPLE_ROOT = path.join(__dirname, '../examples');

describe('Python Example Project', () => {
  const plugin = createPythonPlugin();

  // Initialize plugin before tests
  beforeAll(async () => {
    await plugin.initialize?.(EXAMPLE_ROOT);
  });

  async function getRelations(relPath: string) {
    const fullPath = path.join(EXAMPLE_ROOT, relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const analysis = await plugin.analyzeFile?.(fullPath, content, EXAMPLE_ROOT);
    return analysis?.relations ?? [];
  }

  // Helper to get workspace-relative resolved path
  function toRelative(absolutePath: string | null): string | null {
    if (absolutePath === null) return null;
    return path.relative(EXAMPLE_ROOT, absolutePath).replace(/\\/g, '/');
  }

  describe('main.py imports', () => {
    it('should detect 3 imports in main.py', async () => {
      const relations = await getRelations('src/main.py');
      expect(relations).toHaveLength(3);
    });

    it('should resolve "import config" to src/config.py', async () => {
      const relations = await getRelations('src/main.py');
      const configConn = relations.find(connection => connection.specifier === 'config');
      expect(configConn).toBeDefined();

      const resolved = toRelative(configConn!.resolvedPath);
      expect(resolved).toBe('src/config.py');
    });

    it('should resolve "from services.api import fetch_data" to src/services/api.py', async () => {
      const relations = await getRelations('src/main.py');
      const apiConn = relations.find(connection => connection.specifier?.includes('services.api'));
      expect(apiConn).toBeDefined();

      const resolved = toRelative(apiConn!.resolvedPath);
      expect(resolved).toBe('src/services/api.py');
    });

    it('should resolve "from utils.helpers import process_data" to src/utils/helpers.py', async () => {
      const relations = await getRelations('src/main.py');
      const helpersConn = relations.find(connection => connection.specifier?.includes('utils.helpers'));
      expect(helpersConn).toBeDefined();

      const resolved = toRelative(helpersConn!.resolvedPath);
      expect(resolved).toBe('src/utils/helpers.py');
    });
  });

  describe('services/api.py imports', () => {
    it('should detect import in api.py', async () => {
      const relations = await getRelations('src/services/api.py');
      expect(relations.length).toBeGreaterThan(0);
    });

    it('should resolve "from utils.helpers import process_data" to src/utils/helpers.py', async () => {
      const relations = await getRelations('src/services/api.py');
      const helpersConn = relations.find(connection => connection.specifier?.includes('utils.helpers'));
      expect(helpersConn).toBeDefined();

      const resolved = toRelative(helpersConn!.resolvedPath);
      expect(resolved).toBe('src/utils/helpers.py');
    });
  });

  describe('utils/helpers.py imports', () => {
    it('should detect import in helpers.py', async () => {
      const relations = await getRelations('src/utils/helpers.py');
      expect(relations.length).toBeGreaterThan(0);
    });

    it('should resolve "from utils.format import format_output" to src/utils/format.py', async () => {
      const relations = await getRelations('src/utils/helpers.py');
      const formatConn = relations.find(connection => connection.specifier?.includes('utils.format'));
      expect(formatConn).toBeDefined();

      const resolved = toRelative(formatConn!.resolvedPath);
      expect(resolved).toBe('src/utils/format.py');
    });
  });

  describe('member_imports.py imports', () => {
    it('should resolve "from services import api" to src/services/api.py', async () => {
      const relations = await getRelations('src/member_imports.py');
      const apiConn = relations.find(connection => connection.specifier === 'from services import api');
      expect(apiConn).toBeDefined();

      const resolved = toRelative(apiConn!.resolvedPath);
      expect(resolved).toBe('src/services/api.py');
    });

    it('should resolve "from utils import helpers" to src/utils/helpers.py', async () => {
      const relations = await getRelations('src/member_imports.py');
      const helpersConn = relations.find(connection => connection.specifier === 'from utils import helpers');
      expect(helpersConn).toBeDefined();

      const resolved = toRelative(helpersConn!.resolvedPath);
      expect(resolved).toBe('src/utils/helpers.py');
    });

    it('should keep third-party imports unresolved', async () => {
      const relations = await getRelations('src/member_imports.py');
      const requestsConn = relations.find(connection => connection.specifier === 'from requests import Session');
      expect(requestsConn).toBeDefined();
      expect(requestsConn?.resolvedPath).toBeNull();
    });
  });

  describe('namespace_consumer.py imports', () => {
    it('should resolve namespace package import to src/ns_pkg/member.py', async () => {
      const relations = await getRelations('src/namespace_consumer.py');
      const namespaceConn = relations.find(connection => connection.specifier === 'from ns_pkg import member');
      expect(namespaceConn).toBeDefined();

      const resolved = toRelative(namespaceConn!.resolvedPath);
      expect(resolved).toBe('src/ns_pkg/member.py');
    });
  });
});
