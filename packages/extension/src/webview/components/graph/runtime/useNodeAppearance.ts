import {
	useEffect,
	type MutableRefObject,
} from 'react';
import type { IGraphData } from '../../../../shared/types';
import { ThemeKind, adjustColorForLightTheme } from '../../../hooks/useTheme';
import {
	calculateNodeSizes,
	DEFAULT_NODE_SIZE,
	FAVORITE_BORDER_COLOR,
	getDepthSizeMultiplier,
	type FGLink,
	type FGNode,
} from '../../graphModel';

interface UseNodeAppearanceOptions {
	dataRef: MutableRefObject<IGraphData>;
	favorites: Set<string>;
	graphDataRef: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
	nodeSizeMode: string;
	theme: ThemeKind;
}

export function useNodeAppearance({
	dataRef,
	favorites,
	graphDataRef,
	nodeSizeMode,
	theme,
}: UseNodeAppearanceOptions): void {
	useEffect(() => {
		const nodes = graphDataRef.current.nodes;
		if (nodes.length === 0) return;

		const dataNodeMap = new Map(dataRef.current.nodes.map(node => [node.id, node]));
		const sizes = calculateNodeSizes(
			dataRef.current.nodes,
			dataRef.current.edges,
			nodeSizeMode as Parameters<typeof calculateNodeSizes>[2],
		);
		const isLight = theme === 'light';

		for (const node of nodes) {
			const dataNode = dataNodeMap.get(node.id);
			if (!dataNode) continue;

			const rawColor = isLight ? adjustColorForLightTheme(dataNode.color) : dataNode.color;
			const isFavorite = favorites.has(node.id);
			const isFocused = (dataNode.depthLevel ?? 0) === 0;

			node.size = (sizes.get(node.id) ?? DEFAULT_NODE_SIZE) * getDepthSizeMultiplier(dataNode.depthLevel ?? 0);
			node.color = rawColor;
			node.isFavorite = isFavorite;
			node.borderColor = isFocused
				? (isLight ? '#2563eb' : '#60a5fa')
				: isFavorite
					? FAVORITE_BORDER_COLOR
					: rawColor;
			node.borderWidth = isFocused ? 4 : isFavorite ? 3 : 2;
		}
	}, [dataRef, favorites, graphDataRef, nodeSizeMode, theme]);
}
