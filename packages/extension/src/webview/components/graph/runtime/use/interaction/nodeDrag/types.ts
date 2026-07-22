import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type { FGNode } from '../../../../model/build';

export interface NodeDragTranslate {
  x: number;
  y: number;
}

export interface NodeDragGroupSession {
  draggedNodeIds: Set<string>;
  primaryNodeId: string;
}

export interface NodeDragGraphData {
  nodes: readonly FGNode[];
}

export interface ApplyNodeDragOptions {
  graphData: NodeDragGraphData;
  selectedNodeIds: ReadonlySet<string>;
}

export interface NodeDragEndOptions {
  graphData: NodeDragGraphData;
  graphViewContributions?: Pick<ExtensionGraphViewContributionSet, 'nodeDragEnd'>;
}

export interface NodeDragPolicyContext {
  graphData?: NodeDragGraphData;
  graphViewContributions?: Pick<ExtensionGraphViewContributionSet, 'nodeDragEnd'>;
}
