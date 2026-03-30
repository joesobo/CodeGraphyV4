import type {
	ForceGraphMethods as FG2DMethods,
} from 'react-force-graph-2d';
import type { MutableRefObject } from 'react';
import type {
	GraphTooltipRect,
} from '../../tooltipModel';
import {
	DEFAULT_NODE_SIZE,
	type FGLink,
	type FGNode,
} from '../../model/build';

interface GraphTooltipRectOptions {
	containerRef: MutableRefObject<HTMLDivElement | null>;
	fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
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
	const radius = (node.size ?? DEFAULT_NODE_SIZE) * zoom;

	return {
		x: screen.x + rect.left,
		y: screen.y + rect.top,
		radius,
	};
}
