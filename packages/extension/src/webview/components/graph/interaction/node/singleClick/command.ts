import type { GraphNodeClickCommand } from '../../model';
import { buildNodeSingleClickInteractionEffect } from '../effect';
import { buildNodeSingleClickSelectionResult } from './selection';

export interface GraphNodeSingleClickOptions {
  clientX: number;
  clientY: number;
  ctrlKey: boolean;
  isCollapsedGraphSection?: boolean;
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
  if (options.isCollapsedGraphSection && !options.ctrlKey && !options.shiftKey && !options.metaKey) {
    return {
      nextLastClick: null,
      effects: [
        { kind: 'setGraphSectionCollapsed', sectionId: options.nodeId, collapsed: false },
        buildNodeSingleClickInteractionEffect(options),
      ],
    };
  }

  const { effects, nextLastClick } = buildNodeSingleClickSelectionResult(options);
  effects.push(buildNodeSingleClickInteractionEffect(options));

  return { nextLastClick, effects };
}
