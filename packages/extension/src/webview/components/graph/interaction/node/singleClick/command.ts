import type { GraphNodeClickCommand } from '../../model';
import { buildNodeSingleClickSelectionResult } from './selection';

export interface GraphNodeSingleClickOptions {
  clientX: number;
  clientY: number;
  ctrlKey: boolean;
  label: string;
  metaKey: boolean;
  nodeId: string;
  now: number;
  selectedNodeIds: Iterable<string>;
  shiftKey: boolean;
}

export function getNodeSingleClickCommand(
  options: GraphNodeSingleClickOptions,
): GraphNodeClickCommand {
  return buildNodeSingleClickSelectionResult(options);
}
