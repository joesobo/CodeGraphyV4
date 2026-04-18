import {
	useEffect,
	type MutableRefObject,
} from 'react';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import { ThemeKind, adjustColorForLightTheme } from '../../../../theme/useTheme';
import {
	calculateNodeSizes,
	FAVORITE_BORDER_COLOR,
	getDepthSizeMultiplier,
	type FGLink,
	type FGNode,
} from '../../model/build';

interface UseNodeAppearanceOptions {
	dataRef: MutableRefObject<IGraphData>;
	favorites: Set<string>;
	graphDataRef: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
	nodeSizeMode: string;
	theme: ThemeKind;
}

export interface ApplyNodeAppearanceOptions {
	data: IGraphData;
	favorites: ReadonlySet<string>;
	graphNodes: FGNode[];
	nodeSizeMode: Parameters<typeof calculateNodeSizes>[2];
	theme: ThemeKind;
}

function getFocusedBorderColor(isLightTheme: boolean): string {
	return isLightTheme ? '#2563eb' : '#60a5fa';
}

function getNodeBorderColor(options: {
	isFavorite: boolean;
	isFocused: boolean;
	isLightTheme: boolean;
	nodeColor: string;
}): string {
	if (options.isFocused) {
		return getFocusedBorderColor(options.isLightTheme);
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

export function applyNodeAppearance({
	data,
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
		const isFavorite = favorites.has(graphNode.id);
		const isFocused = depthLevel === 0;

		graphNode.size = sizes.get(graphNode.id)! * getDepthSizeMultiplier(depthLevel);
		graphNode.color = nodeColor;
		graphNode.isFavorite = isFavorite;
		graphNode.borderColor = getNodeBorderColor({
			isFavorite,
			isFocused,
			isLightTheme,
			nodeColor,
		});
		graphNode.borderWidth = getNodeBorderWidth({ isFavorite, isFocused });
	}
}

export function useNodeAppearance({
	dataRef,
	favorites,
	graphDataRef,
	nodeSizeMode,
	theme,
}: UseNodeAppearanceOptions): void {
	useEffect(() => {
		applyNodeAppearance({
			data: dataRef.current,
			favorites,
			graphNodes: graphDataRef.current.nodes,
			nodeSizeMode: nodeSizeMode as Parameters<typeof calculateNodeSizes>[2],
			theme,
		});
	}, [dataRef, favorites, graphDataRef, nodeSizeMode, theme]);
}
