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
		const isFavorite = favorites.has(graphNode.id);
		const isFocused = depthLevel === 0;

		graphNode.size = sizes.get(graphNode.id)! * getDepthSizeMultiplier(depthLevel);
		graphNode.color = nodeColor;
		graphNode.baseOpacity = getNodeBaseOpacity(dataNode);
		graphNode.isFavorite = isFavorite;
		graphNode.borderColor = getNodeBorderColor({
			appearance,
			isFavorite,
			isFocused,
			nodeColor,
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
