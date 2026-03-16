import {
	useEffect,
	type MutableRefObject,
} from 'react';
import * as THREE from 'three';
import type { FGLink, FGNode } from '../../graphModel';

interface UseMeshHighlightsOptions {
	graphDataRef: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
	highlightVersion: number;
	highlightedNeighborsRef: MutableRefObject<Set<string>>;
	highlightedNodeRef: MutableRefObject<string | null>;
	meshesRef: MutableRefObject<Map<string, THREE.Mesh>>;
	selectedNodesSetRef: MutableRefObject<Set<string>>;
}

export function useMeshHighlights({
	graphDataRef,
	highlightVersion,
	highlightedNeighborsRef,
	highlightedNodeRef,
	meshesRef,
	selectedNodesSetRef,
}: UseMeshHighlightsOptions): void {
	useEffect(() => {
		const highlighted = highlightedNodeRef.current;

		for (const [nodeId, mesh] of meshesRef.current) {
			const material = mesh.material as THREE.MeshLambertMaterial;
			const node = graphDataRef.current.nodes.find(graphNode => graphNode.id === nodeId);
			if (!node) continue;

			const isHighlighted = !highlighted
				|| nodeId === highlighted
				|| highlightedNeighborsRef.current.has(nodeId);
			const isSelected = selectedNodesSetRef.current.has(nodeId);

			if (!isHighlighted) {
				material.color.set('#646464');
				material.opacity = 0.3;
				continue;
			}

			material.color.set(isSelected ? '#ffffff' : node.color);
			material.opacity = 1.0;
		}
	}, [graphDataRef, highlightVersion, highlightedNeighborsRef, highlightedNodeRef, meshesRef, selectedNodesSetRef]);
}
