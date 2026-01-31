import { describe, it, expect } from 'vitest';
import { getMockGraphData, MOCK_FILE_DATA } from '../../src/shared/mockData';
import { FILE_TYPE_COLORS, DEFAULT_NODE_COLOR } from '../../src/shared/types';

describe('Mock Data', () => {
  describe('MOCK_FILE_DATA', () => {
    it('should have a reasonable number of mock files', () => {
      expect(MOCK_FILE_DATA.length).toBeGreaterThan(10);
      expect(MOCK_FILE_DATA.length).toBeLessThan(50);
    });

    it('should have valid file data structure', () => {
      MOCK_FILE_DATA.forEach((file) => {
        expect(file.path).toBeDefined();
        expect(file.name).toBeDefined();
        expect(file.extension).toBeDefined();
        expect(Array.isArray(file.imports)).toBe(true);
      });
    });

    it('should have consistent path and name', () => {
      MOCK_FILE_DATA.forEach((file) => {
        expect(file.path.endsWith(file.name)).toBe(true);
      });
    });

    it('should have consistent name and extension', () => {
      MOCK_FILE_DATA.forEach((file) => {
        expect(file.name.endsWith(file.extension)).toBe(true);
      });
    });

    it('should only import existing files', () => {
      const allPaths = new Set(MOCK_FILE_DATA.map((f) => f.path));
      MOCK_FILE_DATA.forEach((file) => {
        file.imports.forEach((importPath) => {
          expect(allPaths.has(importPath)).toBe(true);
        });
      });
    });
  });

  describe('getMockGraphData', () => {
    it('should return valid graph data structure', () => {
      const data = getMockGraphData();
      expect(data).toHaveProperty('nodes');
      expect(data).toHaveProperty('edges');
      expect(Array.isArray(data.nodes)).toBe(true);
      expect(Array.isArray(data.edges)).toBe(true);
    });

    it('should create nodes for all mock files', () => {
      const data = getMockGraphData();
      expect(data.nodes.length).toBe(MOCK_FILE_DATA.length);
    });

    it('should create nodes with correct properties', () => {
      const data = getMockGraphData();
      data.nodes.forEach((node) => {
        expect(node.id).toBeDefined();
        expect(node.label).toBeDefined();
        expect(node.color).toBeDefined();
        expect(typeof node.id).toBe('string');
        expect(typeof node.label).toBe('string');
        expect(typeof node.color).toBe('string');
      });
    });

    it('should use file path as node id', () => {
      const data = getMockGraphData();
      const mockPaths = MOCK_FILE_DATA.map((f) => f.path);
      data.nodes.forEach((node) => {
        expect(mockPaths).toContain(node.id);
      });
    });

    it('should use filename as node label', () => {
      const data = getMockGraphData();
      const mockNames = MOCK_FILE_DATA.map((f) => f.name);
      data.nodes.forEach((node) => {
        expect(mockNames).toContain(node.label);
      });
    });

    it('should assign correct colors based on file extension', () => {
      const data = getMockGraphData();
      data.nodes.forEach((node) => {
        const file = MOCK_FILE_DATA.find((f) => f.path === node.id);
        expect(file).toBeDefined();
        const expectedColor = FILE_TYPE_COLORS[file!.extension] ?? DEFAULT_NODE_COLOR;
        expect(node.color).toBe(expectedColor);
      });
    });

    it('should create edges for all imports', () => {
      const data = getMockGraphData();
      const totalImports = MOCK_FILE_DATA.reduce((sum, f) => sum + f.imports.length, 0);
      expect(data.edges.length).toBe(totalImports);
    });

    it('should create edges with correct structure', () => {
      const data = getMockGraphData();
      data.edges.forEach((edge) => {
        expect(edge.id).toBeDefined();
        expect(edge.from).toBeDefined();
        expect(edge.to).toBeDefined();
        expect(edge.id).toBe(`${edge.from}->${edge.to}`);
      });
    });

    it('should have unique edge ids', () => {
      const data = getMockGraphData();
      const edgeIds = data.edges.map((e) => e.id);
      const uniqueIds = new Set(edgeIds);
      expect(uniqueIds.size).toBe(edgeIds.length);
    });

    it('should have unique node ids', () => {
      const data = getMockGraphData();
      const nodeIds = data.nodes.map((n) => n.id);
      const uniqueIds = new Set(nodeIds);
      expect(uniqueIds.size).toBe(nodeIds.length);
    });
  });
});
