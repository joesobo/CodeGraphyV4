import { describe, it, expect } from 'vitest';
import { fileDataToNodes, fileDataToEdges } from '../../src/shared/mock/transforms';
import { getMockGraphData } from '../../src/shared/mockData';
import type { IFileData } from '../../src/shared/mock/fileData';

const sampleFiles: IFileData[] = [
  { path: 'src/a.ts', name: 'a.ts', extension: '.ts', imports: ['src/b.ts'] },
  { path: 'src/b.ts', name: 'b.ts', extension: '.ts', imports: [] },
  { path: 'src/c.tsx', name: 'c.tsx', extension: '.tsx', imports: ['src/missing.ts'] },
];

describe('fileDataToNodes', () => {
  it('creates one node per file', () => {
    const nodes = fileDataToNodes(sampleFiles);
    expect(nodes).toHaveLength(sampleFiles.length);
  });

  it('uses the file path as the node id', () => {
    const nodes = fileDataToNodes(sampleFiles);
    expect(nodes[0].id).toBe('src/a.ts');
    expect(nodes[1].id).toBe('src/b.ts');
  });

  it('uses the file name as the node label', () => {
    const nodes = fileDataToNodes(sampleFiles);
    expect(nodes[0].label).toBe('a.ts');
    expect(nodes[1].label).toBe('b.ts');
  });

  it('assigns a color derived from file extension', () => {
    const nodes = fileDataToNodes(sampleFiles);
    // .ts and .tsx have distinct colors
    expect(typeof nodes[0].color).toBe('string');
    expect(nodes[0].color).not.toBe('');
    expect(nodes[2].color).not.toBe(nodes[0].color);
  });

  it('returns an empty array when given no files', () => {
    expect(fileDataToNodes([])).toEqual([]);
  });
});

describe('fileDataToEdges', () => {
  it('creates an edge for each valid import relationship', () => {
    const edges = fileDataToEdges(sampleFiles);
    // a.ts -> b.ts is valid; c.tsx -> missing.ts is not
    expect(edges).toHaveLength(1);
  });

  it('uses from->to path as the edge id', () => {
    const edges = fileDataToEdges(sampleFiles);
    expect(edges[0].id).toBe('src/a.ts->src/b.ts');
  });

  it('sets from and to correctly', () => {
    const edges = fileDataToEdges(sampleFiles);
    expect(edges[0].from).toBe('src/a.ts');
    expect(edges[0].to).toBe('src/b.ts');
  });

  it('omits edges where the imported file does not exist', () => {
    const edges = fileDataToEdges(sampleFiles);
    const toValues = edges.map((e) => e.to);
    expect(toValues).not.toContain('src/missing.ts');
  });

  it('returns an empty array when given no files', () => {
    expect(fileDataToEdges([])).toEqual([]);
  });

  it('returns an empty array when no valid imports exist', () => {
    const isolated: IFileData[] = [
      { path: 'a.ts', name: 'a.ts', extension: '.ts', imports: ['nonexistent.ts'] },
    ];
    expect(fileDataToEdges(isolated)).toEqual([]);
  });
});

describe('getMockGraphData', () => {
  it('returns an object with nodes and edges arrays', () => {
    const data = getMockGraphData();
    expect(Array.isArray(data.nodes)).toBe(true);
    expect(Array.isArray(data.edges)).toBe(true);
  });

  it('produces nodes for all mock files', () => {
    const data = getMockGraphData();
    expect(data.nodes.length).toBeGreaterThan(0);
  });

  it('produces edges only for valid imports', () => {
    const data = getMockGraphData();
    const nodeIds = new Set(data.nodes.map((n) => n.id));
    for (const edge of data.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });
});
