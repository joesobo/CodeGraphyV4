import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactElement,
} from 'react';
import type { GraphAccessibilityItems } from '../accessibility';
import type { FGLink, FGNode } from '../../model/build';
import {
  handleAccessibilityNodeKeyDown,
  toNativeMouseEvent,
} from './events';

type AccessibilityEvent =
  | MouseEvent
  | ReactMouseEvent<HTMLElement>
  | ReactKeyboardEvent<HTMLElement>;

export function GraphAccessibilityOverlay({
  accessibilityItems,
  graphLinks,
  graphNodes,
  onEdgeContextMenu,
  onNodeClick,
  onNodeContextMenu,
  onNodeHover,
}: {
  accessibilityItems: GraphAccessibilityItems;
  graphLinks: readonly FGLink[];
  graphNodes: readonly FGNode[];
  onEdgeContextMenu(this: void, link: FGLink, event: MouseEvent): void;
  onNodeClick(this: void, node: FGNode, event: MouseEvent): void;
  onNodeContextMenu(this: void, nodeId: string, event: MouseEvent): void;
  onNodeHover(this: void, node: FGNode | null): void;
}): ReactElement {
  const findNode = (nodeId: string) => graphNodes.find(node => node.id === nodeId) ?? null;
  const findLink = (edgeId: string) => graphLinks.find(link => link.id === edgeId) ?? null;
  const handleNodeClick = (nodeId: string, event: AccessibilityEvent) => {
    const node = findNode(nodeId);
    if (!node) return;

    onNodeClick(node, toNativeMouseEvent('click', event));
  };
  const handleNodeContextMenu = (nodeId: string, event: ReactMouseEvent<HTMLElement>) => {
    if (!findNode(nodeId)) return;

    event.preventDefault();
    event.stopPropagation();
    onNodeContextMenu(nodeId, toNativeMouseEvent('contextmenu', event));
  };
  const handleEdgeContextMenu = (edgeId: string, event: ReactMouseEvent<HTMLElement>) => {
    const link = findLink(edgeId);
    if (!link) return;

    event.preventDefault();
    event.stopPropagation();
    onEdgeContextMenu(link, toNativeMouseEvent('contextmenu', event));
  };
  const handleNodeHover = (nodeId: string) => {
    onNodeHover(findNode(nodeId));
  };

  return (
    <div
      aria-label="Graph accessibility"
      className="absolute inset-0 pointer-events-none"
      data-codegraphy-layer="graph-accessibility"
    >
      {accessibilityItems.nodes.map(node => (
        <div
          key={node.id}
          aria-label={node.label}
          role="button"
          tabIndex={0}
          className="absolute rounded-full opacity-0"
          onBlur={() => onNodeHover(null)}
          onClick={event => handleNodeClick(node.id, event)}
          onContextMenu={event => handleNodeContextMenu(node.id, event)}
          onFocus={() => handleNodeHover(node.id)}
          onKeyDown={event => handleAccessibilityNodeKeyDown(node.id, handleNodeClick, event)}
          onMouseOut={() => onNodeHover(null)}
          onMouseOver={() => handleNodeHover(node.id)}
          style={{
            height: node.radius * 2,
            left: node.x,
            top: node.y,
            transform: 'translate(-50%, -50%)',
            width: node.radius * 2,
          }}
        />
      ))}
      <div className="sr-only">
        {accessibilityItems.edges.map(edge => (
          <span
            key={edge.id}
            aria-label={edge.label}
            role="img"
            onContextMenu={event => handleEdgeContextMenu(edge.id, event)}
          />
        ))}
      </div>
    </div>
  );
}
