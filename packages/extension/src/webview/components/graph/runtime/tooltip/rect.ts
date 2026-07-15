import type { OwnedGraph2dControls } from '../../rendering/surface/owned2d/contracts';
import type { MutableRefObject } from 'react';
import type {
	GraphTooltipRect,
} from '../../tooltip/model';
import {
	DEFAULT_NODE_SIZE,
	type FGNode,
} from '../../model/build';
import { graphNodeScreenRadius } from '@codegraphy-dev/graph-renderer';

interface GraphTooltipRectOptions {
	containerRef: MutableRefObject<HTMLDivElement | null>;
	fg2dRef: MutableRefObject<OwnedGraph2dControls | undefined>;
}

interface GraphTooltipGraph {
	graph2ScreenCoords(x: number, y: number): { x: number; y: number };
	zoom(): number;
}

export function getTooltipNodeRect(
	{ containerRef, fg2dRef }: GraphTooltipRectOptions,
	node: FGNode,
): GraphTooltipRect | null {
	const graph = fg2dRef.current as GraphTooltipGraph | undefined;
	const canvas = containerRef.current?.querySelector('canvas');
	if (!graph || !canvas) return null;

	const screen = graph.graph2ScreenCoords(node.x ?? 0, node.y ?? 0);
	const rect = canvas.getBoundingClientRect();
	const zoom = graph.zoom();
	const radius = graphNodeScreenRadius(node.size ?? DEFAULT_NODE_SIZE, zoom);

	return {
		x: screen.x + rect.left,
		y: screen.y + rect.top,
		radius,
	};
}
