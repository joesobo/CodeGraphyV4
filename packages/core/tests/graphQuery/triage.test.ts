import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../src/graph/contracts';
import { triageGraph } from '../../src/graphQuery/triage';

const files = [
  {
    filePath: 'packages/extension/src/graph/sizing/calculations.ts',
    content: 'export function connectionRadius(count: number) { return boundedSquareRoot(count); }',
  },
  {
    filePath: 'packages/tldraw/src/document/records.ts',
    content: 'export function createOfflineGraphDocument() { return createFileNodeDiameter(); }',
  },
  {
    filePath: 'packages/tldraw/src/script/physics/engine/model.ts',
    content: 'export function createPhysicsEngine() { return visibleCollisionAndRepelSize(); }',
  },
  {
    filePath: 'packages/core/src/graph/contracts.ts',
    content: 'export interface GraphNode { nodeType: string; }',
  },
];

const graphData: IGraphData = {
  nodes: files.map(file => ({ id: file.filePath, label: file.filePath.split('/').at(-1) ?? '', nodeType: 'file' })),
  edges: [],
};

function triage(query: string, limit = 8, offset = 0) {
  return triageGraph({
    graphData,
    sourceText: { files, filesScanned: files.length, filesSkipped: 0 },
    cacheState: 'fresh',
  }, { query, limit, offset });
}

describe('core/graphQuery triage', () => {
  it('fuses independent task terms into a compact coverage-balanced File set', () => {
    const result = triage(
      'Enhance offline graph document node sizing with bounded connection behavior and visible collision physics',
    );

    expect(result.files.map(file => file.path)).toEqual(expect.arrayContaining([
      'packages/extension/src/graph/sizing/calculations.ts',
      'packages/tldraw/src/document/records.ts',
      'packages/tldraw/src/script/physics/engine/model.ts',
    ]));
    expect(result.files.find(file => file.path.endsWith('records.ts'))?.matchedTerms).toEqual(
      expect.arrayContaining(['document', 'offline']),
    );
    expect(result.files.find(file => file.path.endsWith('model.ts'))?.matchedTerms).toEqual(
      expect.arrayContaining(['collision', 'physics', 'visible']),
    );
    expect(result.terms.length).toBeLessThanOrEqual(12);
    expect(result.sources).toEqual({
      text: { freshness: 'live', filesScanned: 4, filesSkipped: 0 },
      graph: { freshness: 'cached', cacheState: 'fresh' },
    });
  });

  it('keeps distinct task concepts visible when one subsystem has many lexical matches', () => {
    const physicsFiles = Array.from({ length: 12 }, (_, index) => ({
      filePath: `packages/renderer/src/physics/collision/force-${index}.ts`,
      content: 'export function physicsCollision() { return visibleNodeSize(); }',
    }));
    const allFiles = [...files, ...physicsFiles];
    const result = triageGraph({
      graphData: {
        nodes: allFiles.map(file => ({
          id: file.filePath,
          label: file.filePath.split('/').at(-1) ?? '',
          nodeType: 'file',
        })),
        edges: [],
      },
      sourceText: { files: allFiles, filesScanned: allFiles.length, filesSkipped: 0 },
    }, {
      query: 'offline graph document connection sizing visible collision physics',
      limit: 8,
    });

    expect(result.files.map(file => file.path)).toEqual(expect.arrayContaining([
      'packages/extension/src/graph/sizing/calculations.ts',
      'packages/tldraw/src/document/records.ts',
      'packages/tldraw/src/script/physics/engine/model.ts',
    ]));
  });

  it('uses graph degree to prefer a central owner among equally matching Files', () => {
    const sourceFiles = [
      { filePath: 'src/domain/a-leaf.ts', content: 'export const documentNode = 1;' },
      { filePath: 'src/domain/z-owner.ts', content: 'export const documentNode = 1;' },
      ...Array.from({ length: 5 }, (_, index) => ({
        filePath: `src/consumer-${index}.ts`,
        content: 'export const consumer = true;',
      })),
    ];
    const result = triageGraph({
      graphData: {
        nodes: sourceFiles.map(file => ({ id: file.filePath, label: file.filePath, nodeType: 'file' })),
        edges: sourceFiles.slice(2).map((file, index) => ({
          id: `edge-${index}`,
          from: file.filePath,
          to: 'src/domain/z-owner.ts',
          kind: 'import',
          sources: [],
        })),
      },
      sourceText: { files: sourceFiles, filesScanned: sourceFiles.length, filesSkipped: 0 },
    }, { query: 'document node', limit: 2 });

    expect(result.files[0]?.path).toBe('src/domain/z-owner.ts');
  });

  it('prefers production Files when a matching test has equivalent evidence', () => {
    const sourceFiles = [
      { filePath: 'src/domain/owner.test.ts', content: 'export const documentNode = 1;' },
      { filePath: 'src/domain/owner.ts', content: 'export const documentNode = 1;' },
    ];
    const result = triageGraph({
      graphData: {
        nodes: sourceFiles.map(file => ({ id: file.filePath, label: file.filePath, nodeType: 'file' })),
        edges: [],
      },
      sourceText: { files: sourceFiles, filesScanned: sourceFiles.length, filesSkipped: 0 },
    }, { query: 'document node', limit: 2 });

    expect(result.files[0]?.path).toBe('src/domain/owner.ts');
  });

  it('is deterministic and paginates one fused ranking', () => {
    const query = 'offline graph document connection sizing collision physics';
    const complete = triage(query);
    const page = triage(query, 2, 1);

    expect(triage(query)).toEqual(complete);
    expect(page.files).toEqual(complete.files.slice(1, 3));
    expect(page.page).toEqual({
      offset: 1,
      limit: 2,
      returned: 2,
      total: complete.files.length,
      nextOffset: 3,
    });
  });

  it('omits terms that have no eligible File evidence', () => {
    const result = triage('zzzzzz offline documents');

    expect(result.terms).not.toContain('zzzzzz');
    expect(result.files.every(file => file.matchedTerms.length > 0)).toBe(true);
  });
});
