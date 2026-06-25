import {
	useEffect,
	type MutableRefObject,
} from 'react';
import type * as THREE from 'three';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../../appearance/model';
import type { FGLink, FGNode } from '../../../model/build';

interface UseMeshHighlightsOptions {
	graphDataRef: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
	appearance?: Pick<GraphAppearance, 'meshDimmed' | 'meshSelected'>;
	highlightVersion: number;
	highlightedNeighborsRef: MutableRefObject<Set<string>>;
	highlightedNodeRef: MutableRefObject<string | null>;
	meshesRef: MutableRefObject<Map<string, THREE.Mesh>>;
	selectedNodesSetRef: MutableRefObject<Set<string>>;
}

export interface MeshHighlightVisuals {
	color: string;
	opacity: number;
}

const DIMMED_OPACITY = 0.3;
const HIGHLIGHTED_OPACITY = 1.0;

export function findGraphNodeById(nodes: FGNode[], nodeId: string): FGNode | undefined {
	return nodes.find(graphNode => graphNode.id === nodeId);
}

export function isMeshNodeHighlighted(options: {
	highlighted: string | null;
	highlightedNeighbors: ReadonlySet<string>;
	nodeId: string;
}): boolean {
	const { highlighted, highlightedNeighbors, nodeId } = options;

	if (!highlighted) {
		return true;
	}

	return nodeId === highlighted || highlightedNeighbors.has(nodeId);
}

export function getMeshHighlightVisuals(options: {
	appearance?: Pick<GraphAppearance, 'meshDimmed' | 'meshSelected'>;
	isHighlighted: boolean;
	isSelected: boolean;
	nodeColor: string;
}): MeshHighlightVisuals {
	const { appearance = DEFAULT_GRAPH_APPEARANCE, isHighlighted, isSelected, nodeColor } = options;

	if (!isHighlighted) {
		return {
			color: appearance.meshDimmed,
			opacity: DIMMED_OPACITY,
		};
	}

	return {
		color: isSelected ? appearance.meshSelected : nodeColor,
		opacity: HIGHLIGHTED_OPACITY,
	};
}

export function updateMeshHighlights(options: {
	graphNodes: FGNode[];
	appearance?: Pick<GraphAppearance, 'meshDimmed' | 'meshSelected'>;
	highlighted: string | null;
	highlightedNeighbors: ReadonlySet<string>;
	meshes: ReadonlyMap<string, THREE.Mesh>;
	selectedNodeIds: ReadonlySet<string>;
}): void {
	const {
		graphNodes,
		appearance = DEFAULT_GRAPH_APPEARANCE,
		highlighted,
		highlightedNeighbors,
		meshes,
		selectedNodeIds,
	} = options;

	for (const [nodeId, mesh] of meshes) {
		const node = findGraphNodeById(graphNodes, nodeId);
		if (!node) {
			continue;
		}

		const material = mesh.material as THREE.MeshLambertMaterial;
		const visuals = getMeshHighlightVisuals({
			appearance,
			isHighlighted: isMeshNodeHighlighted({
				highlighted,
				highlightedNeighbors,
				nodeId,
			}),
			isSelected: selectedNodeIds.has(nodeId),
			nodeColor: node.color,
		});

		material.color.set(visuals.color);
		material.opacity = visuals.opacity;
	}
}

export function useMeshHighlights({
	graphDataRef,
	appearance,
	highlightVersion,
	highlightedNeighborsRef,
	highlightedNodeRef,
	meshesRef,
	selectedNodesSetRef,
}: UseMeshHighlightsOptions): void {
	useEffect(() => {
		updateMeshHighlights({
			graphNodes: graphDataRef.current.nodes,
			appearance,
			highlighted: highlightedNodeRef.current,
			highlightedNeighbors: highlightedNeighborsRef.current,
			meshes: meshesRef.current,
			selectedNodeIds: selectedNodesSetRef.current,
		});
	}, [appearance, graphDataRef, highlightVersion, highlightedNeighborsRef, highlightedNodeRef, meshesRef, selectedNodesSetRef]);
}
