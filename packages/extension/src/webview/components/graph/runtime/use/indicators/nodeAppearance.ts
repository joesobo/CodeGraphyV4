import {
	useEffect,
	type MutableRefObject,
} from 'react';
import type { IGraphData } from '../../../../../../shared/graph/contracts';
import { ThemeKind, adjustColorForLightTheme } from '../../../../../theme/useTheme';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../../appearance/model';
import type { FGLink, FGNode } from '../../../model/build';
import {
	graphNodeBorderColor,
	graphNodeBorderWidth,
	graphNodeDisplayColor,
} from '../../../model/node/appearance';

interface UseNodeAppearanceOptions {
	dataRef: MutableRefObject<IGraphData>;
	appearance?: GraphAppearance;
	favorites: Set<string>;
	graphDataRef: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
	theme: ThemeKind;
}

export interface ApplyNodeAppearanceOptions {
	data: IGraphData;
	appearance?: GraphAppearance;
	favorites: ReadonlySet<string>;
	graphNodes: FGNode[];
	theme: ThemeKind;
}

function getNodeBaseOpacity(dataNode: IGraphData['nodes'][number]): number {
	return dataNode.metadata?.gitIgnored === true ? 0.45 : 1;
}

export function applyNodeAppearance({
	data,
	appearance = DEFAULT_GRAPH_APPEARANCE,
	favorites,
	graphNodes,
	theme,
}: ApplyNodeAppearanceOptions): void {
	const dataNodeMap = new Map(data.nodes.map(node => [node.id, node]));
	const isLightTheme = theme === 'light';

	for (const graphNode of graphNodes) {
		const dataNode = dataNodeMap.get(graphNode.id);
		if (!dataNode) {
			continue;
		}

		const depthLevel = dataNode.depthLevel;
		const nodeColor = isLightTheme ? adjustColorForLightTheme(dataNode.color) : dataNode.color;
		const displayColor = graphNodeDisplayColor(dataNode, nodeColor, appearance);
		const isFavorite = favorites.has(graphNode.id);
		const isFocused = depthLevel === 0;

		graphNode.color = displayColor;
		graphNode.baseOpacity = getNodeBaseOpacity(dataNode);
		graphNode.isFavorite = isFavorite;
		graphNode.borderColor = graphNodeBorderColor({
			appearance,
			isFavorite,
			isFocused,
			nodeColor: displayColor,
		});
		graphNode.borderWidth = graphNodeBorderWidth(isFocused, isFavorite);
	}
}

export function useNodeAppearance({
	dataRef,
	appearance = DEFAULT_GRAPH_APPEARANCE,
	favorites,
	graphDataRef,
	theme,
}: UseNodeAppearanceOptions): void {
	useEffect(() => {
		applyNodeAppearance({
			data: dataRef.current,
			appearance,
			favorites,
			graphNodes: graphDataRef.current.nodes,
			theme,
		});
	}, [appearance, dataRef, favorites, graphDataRef, theme]);
}
