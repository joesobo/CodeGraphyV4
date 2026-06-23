import type { GraphAccessibilityItems } from './accessibility';
import type { ResolvedViewportHandlers, ViewportProps } from './contracts';

const EMPTY_ACCESSIBILITY_ITEMS: GraphAccessibilityItems = { nodes: [], edges: [] };
const ignoreEdgeContextMenu: NonNullable<ViewportProps['handleEdgeContextMenu']> = () => undefined;
const ignoreNodeClick: NonNullable<ViewportProps['handleNodeClick']> = () => undefined;
const ignoreNodeContextMenu: NonNullable<ViewportProps['handleNodeContextMenu']> = () => undefined;
const ignoreNodeHover: NonNullable<ViewportProps['handleNodeHover']> = () => undefined;

export function resolveViewportAccessibilityItems(
  accessibilityItems: ViewportProps['accessibilityItems'],
): GraphAccessibilityItems {
  return accessibilityItems ?? EMPTY_ACCESSIBILITY_ITEMS;
}

export function resolveViewportHandlers({
  handleEdgeContextMenu,
  handleNodeClick,
  handleNodeContextMenu,
  handleNodeHover,
}: Pick<
  ViewportProps,
  'handleEdgeContextMenu' | 'handleNodeClick' | 'handleNodeContextMenu' | 'handleNodeHover'
>): ResolvedViewportHandlers {
  return {
    handleEdgeContextMenu: handleEdgeContextMenu ?? ignoreEdgeContextMenu,
    handleNodeClick: handleNodeClick ?? ignoreNodeClick,
    handleNodeContextMenu: handleNodeContextMenu ?? ignoreNodeContextMenu,
    handleNodeHover: handleNodeHover ?? ignoreNodeHover,
  };
}
