import {
	useEffect,
	type MutableRefObject,
} from 'react';
import type { IGraphData } from '../../../../../../shared/graph/contracts';
import { ThemeKind, adjustColorForLightTheme } from '../../../../../theme/useTheme';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../../appearance/model';
import {
	calculateNodeSizes,
	FAVORITE_BORDER_COLOR,
	FALLBACK_MUTED_NODE_COLOR,
	getDepthSizeMultiplier,
	type FGLink,
	type FGNode,
} from '../../../model/build';

interface UseNodeAppearanceOptions {
	dataRef: MutableRefObject<IGraphData>;
	appearance?: GraphAppearance;
	favorites: Set<string>;
	graphDataRef: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
	nodeSizeMode: string;
	theme: ThemeKind;
}

export interface ApplyNodeAppearanceOptions {
	data: IGraphData;
	appearance?: GraphAppearance;
	favorites: ReadonlySet<string>;
	graphNodes: FGNode[];
	nodeSizeMode: Parameters<typeof calculateNodeSizes>[2];
	theme: ThemeKind;
}

function getNodeBorderColor(options: {
	appearance: Pick<GraphAppearance, 'focusBorder'>;
	isFavorite: boolean;
	isFocused: boolean;
	nodeColor: string;
}): string {
	if (options.isFocused) {
		return options.appearance.focusBorder;
	}

	if (options.isFavorite) {
		return FAVORITE_BORDER_COLOR;
	}

	return options.nodeColor;
}

function getNodeBorderWidth(options: { isFavorite: boolean; isFocused: boolean }): number {
	if (options.isFocused) {
		return 4;
	}

	if (options.isFavorite) {
		return 3;
	}

	return 2;
}

function getNodeBaseOpacity(dataNode: IGraphData['nodes'][number]): number {
	return dataNode.metadata?.gitIgnored === true ? 0.45 : 1;
}

function parseHexColor(color: string): [number, number, number] | undefined {
	const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
	if (!match) {
		return undefined;
	}

	const value = match[1];
	return [
		Number.parseInt(value.slice(0, 2), 16),
		Number.parseInt(value.slice(2, 4), 16),
		Number.parseInt(value.slice(4, 6), 16),
	];
}

function toHexChannel(value: number): string {
	return Math.round(value).toString(16).padStart(2, '0');
}

function mixHexColors(source: string, target: string, amount: number): string {
	const sourceRgb = parseHexColor(source);
	const targetRgb = parseHexColor(target) ?? parseHexColor(FALLBACK_MUTED_NODE_COLOR);
	if (!sourceRgb || !targetRgb) {
		return source;
	}

	const mixed = sourceRgb.map((channel, index) =>
		channel + (targetRgb[index] - channel) * amount
	);
	return `#${mixed.map(toHexChannel).join('')}`;
}

function getNodeColor(options: {
	appearance: Pick<GraphAppearance, 'labelMutedForeground'>;
	dataNode: IGraphData['nodes'][number];
	nodeColor: string;
}): string {
	return options.dataNode.metadata?.gitIgnored === true
		? mixHexColors(options.nodeColor, options.appearance.labelMutedForeground, 0.72)
		: options.nodeColor;
}

export function applyNodeAppearance({
	data,
	appearance = DEFAULT_GRAPH_APPEARANCE,
	favorites,
	graphNodes,
	nodeSizeMode,
	theme,
}: ApplyNodeAppearanceOptions): void {
	const dataNodeMap = new Map(data.nodes.map(node => [node.id, node]));
	const sizes = calculateNodeSizes(data.nodes, data.edges, nodeSizeMode);
	const isLightTheme = theme === 'light';

	for (const graphNode of graphNodes) {
		const dataNode = dataNodeMap.get(graphNode.id);
		if (!dataNode) {
			continue;
		}

		const depthLevel = dataNode.depthLevel;
		const nodeColor = isLightTheme ? adjustColorForLightTheme(dataNode.color) : dataNode.color;
		const displayColor = getNodeColor({ appearance, dataNode, nodeColor });
		const isFavorite = favorites.has(graphNode.id);
		const isFocused = depthLevel === 0;

		graphNode.size = sizes.get(graphNode.id)! * getDepthSizeMultiplier(depthLevel);
		graphNode.color = displayColor;
		graphNode.baseOpacity = getNodeBaseOpacity(dataNode);
		graphNode.isFavorite = isFavorite;
		graphNode.borderColor = getNodeBorderColor({
			appearance,
			isFavorite,
			isFocused,
			nodeColor: displayColor,
		});
		graphNode.borderWidth = getNodeBorderWidth({ isFavorite, isFocused });
	}
}

export function useNodeAppearance({
	dataRef,
	appearance = DEFAULT_GRAPH_APPEARANCE,
	favorites,
	graphDataRef,
	nodeSizeMode,
	theme,
}: UseNodeAppearanceOptions): void {
	useEffect(() => {
		applyNodeAppearance({
			data: dataRef.current,
			appearance,
			favorites,
			graphNodes: graphDataRef.current.nodes,
			nodeSizeMode: nodeSizeMode as Parameters<typeof calculateNodeSizes>[2],
			theme,
		});
	}, [appearance, dataRef, favorites, graphDataRef, nodeSizeMode, theme]);
}
