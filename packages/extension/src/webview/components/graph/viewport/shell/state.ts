import type {
	GraphViewViewportNode,
	GraphViewViewportState,
} from '../../../../pluginHost/api/contracts/webview';
import type { GraphRuntime } from '../../runtime/use/state';

export interface GraphViewport2dControls {
	d3ReheatSimulation?(): void;
	graph2ScreenCoords?(x: number, y: number): { x: number; y: number };
	resumeAnimation?(): void;
	screen2GraphCoords?(x: number, y: number): { x: number; y: number };
	zoom?(): number;
}

export interface CreateGraphViewViewportStateOptions {
	globalScale: number;
	graph: GraphViewport2dControls | undefined;
	nodes: GraphRuntime['renderer']['graphData']['nodes'];
}

function readViewportBoolean(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

function readViewportNumber(value: unknown): number | undefined {
	return Number.isFinite(value) ? value as number : undefined;
}

export function toGraphViewViewportNodes(
	nodes: GraphRuntime['renderer']['graphData']['nodes'],
): GraphViewViewportNode[] {
	return nodes.map(node => {
		const viewportNode = node as GraphViewViewportNode;

		return {
			...viewportNode,
			fx: readViewportNumber(node.fx),
			fy: readViewportNumber(node.fy),
			id: node.id,
			isDragging: readViewportBoolean(node.isDragging),
			isPinned: readViewportBoolean(node.isPinned),
			size: readViewportNumber(node.size),
			vx: readViewportNumber(node.vx),
			vy: readViewportNumber(node.vy),
			x: readViewportNumber(node.x),
			y: readViewportNumber(node.y),
		};
	});
}

export function updateGraphViewViewportNode(
	nodes: GraphRuntime['renderer']['graphData']['nodes'],
	nodeId: string,
	updates: Record<string, unknown>,
): boolean {
	const node = nodes.find(candidate => candidate.id === nodeId);
	if (!node) {
		return false;
	}

	Object.assign(node, updates);
	return true;
}

export function createGraphViewViewportState({
	globalScale,
	graph,
	nodes,
}: CreateGraphViewViewportStateOptions): GraphViewViewportState {
	return {
		graphToScreen: (x, y) => graph?.graph2ScreenCoords ? graph.graph2ScreenCoords(x, y) : { x, y },
		nodes: toGraphViewViewportNodes(nodes),
		reheatSimulation: () => {
			if (graph?.d3ReheatSimulation) {
				graph.d3ReheatSimulation();
			}
		},
		resumeAnimation: () => {
			if (graph?.resumeAnimation) {
				graph.resumeAnimation();
			}
		},
		screenToGraph: (x, y) => graph?.screen2GraphCoords ? graph.screen2GraphCoords(x, y) : { x, y },
		updateNode: (nodeId, updates) => updateGraphViewViewportNode(nodes, nodeId, updates),
		zoom: graph?.zoom ? graph.zoom() : globalScale,
	};
}
