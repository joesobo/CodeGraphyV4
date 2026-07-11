import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../src/shared/graph/contracts';
import {
  applyGraphDataPatchInPlace,
  graphDataPatchSchema,
} from '../../../src/shared/graph/patch';

describe('shared/graph/patch', () => {
  it('applies a validated patch while preserving retained object identities', () => {
    const retained = { id: 'keep', label: 'keep', color: '#111111' };
    const updated = { id: 'update', label: 'update', color: '#111111', favorite: true };
    const graphData: IGraphData = { nodes: [retained, updated], edges: [] };
    const parsed = graphDataPatchSchema.parse({
      addedNodes: [{ id: 'add', label: 'add', color: '#111111' }],
      removedNodeIds: [],
      updatedNodes: [{ id: 'update', label: 'updated', color: '#ffffff' }],
      addedLinks: [{ id: 'link', from: 'add', to: 'keep', kind: 'import', sources: [] }],
      removedLinkIds: [],
    });

    expect(applyGraphDataPatchInPlace(graphData, parsed)).toBe(graphData);
    expect(graphData.nodes[0]).toBe(retained);
    expect(graphData.nodes[1]).toBe(updated);
    expect(updated).toEqual({ id: 'update', label: 'updated', color: '#ffffff' });
    expect(graphData.nodes.at(-1)?.id).toBe('add');
    expect(graphData.edges.map(edge => edge.id)).toEqual(['link']);
  });

  it('rejects malformed patch payloads', () => {
    expect(graphDataPatchSchema.safeParse({
      addedNodes: [{ id: '', label: 'bad', color: '#111111' }],
      removedNodeIds: [],
      updatedNodes: [],
      addedLinks: [],
      removedLinkIds: [],
    }).success).toBe(false);
  });

  it.each([
    {
      addedNodes: [
        { id: 'same', label: 'same', color: '#111111' },
        { id: 'same', label: 'same', color: '#111111' },
      ],
      removedNodeIds: [],
      updatedNodes: [],
      addedLinks: [],
      removedLinkIds: [],
    },
    {
      addedNodes: [{ id: 'same', label: 'same', color: '#111111' }],
      removedNodeIds: [],
      updatedNodes: [{ id: 'same', label: 'updated', color: '#ffffff' }],
      addedLinks: [],
      removedLinkIds: [],
    },
  ])('rejects duplicate or conflicting patch operations', (patch) => {
    expect(graphDataPatchSchema.safeParse(patch).success).toBe(false);
  });
});
