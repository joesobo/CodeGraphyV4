import { renderHook } from '@testing-library/react';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../src/webview/components/graphModel';
import { useMeshHighlights } from '../../../../src/webview/components/graph/runtime/useMeshHighlights';

function createMesh(color: string): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1, 4, 4),
    new THREE.MeshLambertMaterial({ color, transparent: true }),
  );
}

describe('useMeshHighlights', () => {
  it('dims non-highlighted meshes and brightens selected ones', () => {
    const selectedMesh = createMesh('#123456');
    const dimmedMesh = createMesh('#abcdef');

    renderHook(() => useMeshHighlights({
      graphDataRef: {
        current: {
          links: [],
          nodes: [
            { color: '#112233', id: 'selected' },
            { color: '#445566', id: 'dimmed' },
          ] as FGNode[],
        },
      },
      highlightVersion: 1,
      highlightedNeighborsRef: { current: new Set(['selected']) },
      highlightedNodeRef: { current: 'selected' },
      meshesRef: {
        current: new Map([
          ['selected', selectedMesh],
          ['dimmed', dimmedMesh],
        ]),
      },
      selectedNodesSetRef: { current: new Set(['selected']) },
    }));

    const selectedMaterial = selectedMesh.material as THREE.MeshLambertMaterial;
    const dimmedMaterial = dimmedMesh.material as THREE.MeshLambertMaterial;

    expect(selectedMaterial.color.getHexString()).toBe('ffffff');
    expect(selectedMaterial.opacity).toBe(1);
    expect(dimmedMaterial.color.getHexString()).toBe('646464');
    expect(dimmedMaterial.opacity).toBe(0.3);
  });
});
