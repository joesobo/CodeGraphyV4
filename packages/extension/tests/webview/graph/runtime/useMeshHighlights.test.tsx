import { renderHook } from '@testing-library/react';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';
import {
  findGraphNodeById,
  getMeshHighlightVisuals,
  isMeshNodeHighlighted,
  updateMeshHighlights,
  useMeshHighlights,
} from '../../../../src/webview/components/graph/runtime/use/meshHighlights';

function createMesh(color: string): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1, 4, 4),
    new THREE.MeshLambertMaterial({ color, transparent: true }),
  );
}

function getHexString(material: THREE.MeshLambertMaterial): string {
  return (material.color as THREE.Color & { getHexString(): string }).getHexString();
}

function createNodes(): FGNode[] {
  return [
    { color: '#112233', id: 'selected' } as FGNode,
    { color: '#445566', id: 'neighbor' } as FGNode,
    { color: '#778899', id: 'other' } as FGNode,
  ];
}

describe('graph/runtime/useMeshHighlights', () => {
  it('findGraphNodeById returns the matching graph node by id', () => {
    const nodes = createNodes();

    expect(findGraphNodeById(nodes, 'neighbor')).toBe(nodes[1]);
  });

  it('findGraphNodeById returns undefined when no graph node matches', () => {
    expect(findGraphNodeById(createNodes(), 'missing')).toBeUndefined();
  });

  it('isMeshNodeHighlighted keeps all nodes highlighted when no node is focused', () => {
    expect(isMeshNodeHighlighted({
      highlighted: null,
      highlightedNeighbors: new Set(['neighbor']),
      nodeId: 'other',
    })).toBe(true);
  });

  it('isMeshNodeHighlighted returns true for the focused node and its neighbors', () => {
    expect(isMeshNodeHighlighted({
      highlighted: 'selected',
      highlightedNeighbors: new Set(['neighbor']),
      nodeId: 'selected',
    })).toBe(true);

    expect(isMeshNodeHighlighted({
      highlighted: 'selected',
      highlightedNeighbors: new Set(['neighbor']),
      nodeId: 'neighbor',
    })).toBe(true);
  });

  it('isMeshNodeHighlighted returns false for unrelated nodes while focused', () => {
    expect(isMeshNodeHighlighted({
      highlighted: 'selected',
      highlightedNeighbors: new Set(['neighbor']),
      nodeId: 'other',
    })).toBe(false);
  });

  it('getMeshHighlightVisuals dims unhighlighted nodes', () => {
    expect(getMeshHighlightVisuals({
      isHighlighted: false,
      isSelected: false,
      nodeColor: '#112233',
    })).toEqual({
      color: '#646464',
      opacity: 0.3,
    });
  });

  it('getMeshHighlightVisuals keeps the node color for highlighted non-selected nodes', () => {
    expect(getMeshHighlightVisuals({
      isHighlighted: true,
      isSelected: false,
      nodeColor: '#112233',
    })).toEqual({
      color: '#112233',
      opacity: 1,
    });
  });

  it('getMeshHighlightVisuals brightens highlighted selected nodes', () => {
    expect(getMeshHighlightVisuals({
      isHighlighted: true,
      isSelected: true,
      nodeColor: '#112233',
    })).toEqual({
      color: '#ffffff',
      opacity: 1,
    });
  });

  it('updateMeshHighlights skips meshes whose graph node is missing', () => {
    const unknownMesh = createMesh('#abcdef');

    updateMeshHighlights({
      graphNodes: createNodes(),
      highlighted: 'selected',
      highlightedNeighbors: new Set(['neighbor']),
      meshes: new Map([['missing', unknownMesh]]),
      selectedNodeIds: new Set(['selected']),
    });

    const material = unknownMesh.material as THREE.MeshLambertMaterial;
    expect(getHexString(material)).toBe('abcdef');
    expect(material.opacity).toBe(1);
  });

  it('updateMeshHighlights dims unrelated meshes and brightens selected ones', () => {
    const selectedMesh = createMesh('#123456');
    const neighborMesh = createMesh('#aaaaaa');
    const dimmedMesh = createMesh('#abcdef');

    updateMeshHighlights({
      graphNodes: createNodes(),
      highlighted: 'selected',
      highlightedNeighbors: new Set(['neighbor']),
      meshes: new Map([
        ['selected', selectedMesh],
        ['neighbor', neighborMesh],
        ['other', dimmedMesh],
      ]),
      selectedNodeIds: new Set(['selected']),
    });

    const selectedMaterial = selectedMesh.material as THREE.MeshLambertMaterial;
    const neighborMaterial = neighborMesh.material as THREE.MeshLambertMaterial;
    const dimmedMaterial = dimmedMesh.material as THREE.MeshLambertMaterial;

    expect(getHexString(selectedMaterial)).toBe('ffffff');
    expect(selectedMaterial.opacity).toBe(1);
    expect(getHexString(neighborMaterial)).toBe('445566');
    expect(neighborMaterial.opacity).toBe(1);
    expect(getHexString(dimmedMaterial)).toBe('646464');
    expect(dimmedMaterial.opacity).toBe(0.3);
  });

  it('reruns highlight updates when highlightVersion changes across rerender', () => {
    const selectedMesh = createMesh('#123456');
    const neighborMesh = createMesh('#abcdef');
    const highlightedNodeRef = { current: 'selected' };
    const highlightedNeighborsRef = { current: new Set(['neighbor']) };
    const selectedNodesSetRef = { current: new Set(['selected']) };
    const graphDataRef = {
      current: {
        links: [],
        nodes: createNodes(),
      },
    };
    const meshesRef = {
      current: new Map([
        ['selected', selectedMesh],
        ['neighbor', neighborMesh],
      ]),
    };
    const { rerender } = renderHook(
      ({ highlightVersion }: { highlightVersion: number }) => useMeshHighlights({
        graphDataRef,
        highlightVersion,
        highlightedNeighborsRef,
        highlightedNodeRef,
        meshesRef,
        selectedNodesSetRef,
      }),
      {
        initialProps: { highlightVersion: 1 },
      },
    );

    expect(getHexString(selectedMesh.material as THREE.MeshLambertMaterial)).toBe('ffffff');
    expect(getHexString(neighborMesh.material as THREE.MeshLambertMaterial)).toBe('445566');

    highlightedNodeRef.current = 'neighbor';
    highlightedNeighborsRef.current = new Set();
    selectedNodesSetRef.current = new Set(['neighbor']);

    rerender({ highlightVersion: 2 });

    expect(getHexString(selectedMesh.material as THREE.MeshLambertMaterial)).toBe('646464');
    expect((selectedMesh.material as THREE.MeshLambertMaterial).opacity).toBe(0.3);
    expect(getHexString(neighborMesh.material as THREE.MeshLambertMaterial)).toBe('ffffff');
    expect((neighborMesh.material as THREE.MeshLambertMaterial).opacity).toBe(1);
  });
});
