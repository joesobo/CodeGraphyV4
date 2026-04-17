import type { GraphNodeClickCommand } from '../model';
import { buildNodeSingleClickInteractionEffect } from './effect';
import { buildNodeSingleClickSelectionResult } from './singleClickSelection';

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
  const { effects, nextLastClick } = buildNodeSingleClickSelectionResult(options);
  effects.push(buildNodeSingleClickInteractionEffect(options));

  return { nextLastClick, effects };
}
