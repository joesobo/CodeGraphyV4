import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { FGNode } from '../../../../model/build';

export type GraphMode = '2d';

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
  graphMode: GraphMode;
  selectedNodeIds: ReadonlySet<string>;
}

export interface NodeDragEndOptions {
  graphData: NodeDragGraphData;
  graphViewContributions?: Pick<CoreGraphViewContributionSet, 'nodeDragEnd'>;
  graphMode: GraphMode;
}

export interface NodeDragPolicyContext {
  graphData?: NodeDragGraphData;
  graphViewContributions?: Pick<CoreGraphViewContributionSet, 'nodeDragEnd'>;
  graphMode: GraphMode;
}
