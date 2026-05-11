export interface GraphLayoutSettings {
  collapsedNodes: Record<string, boolean>;
}

export const DEFAULT_GRAPH_LAYOUT_SETTINGS: GraphLayoutSettings = {
  collapsedNodes: {},
};

export function getCollapsedGraphNodeIds(graphLayout: GraphLayoutSettings): string[] {
  return Object.entries(graphLayout.collapsedNodes)
    .filter(([, collapsed]) => collapsed)
    .map(([nodeId]) => nodeId);
}

export function setGraphLayoutNodeCollapsed(
  graphLayout: GraphLayoutSettings,
  nodeId: string,
  collapsed: boolean,
): GraphLayoutSettings {
  const collapsedNodes = { ...graphLayout.collapsedNodes };
  if (collapsed) {
    collapsedNodes[nodeId] = true;
  } else {
    delete collapsedNodes[nodeId];
  }

  return { ...graphLayout, collapsedNodes };
}
