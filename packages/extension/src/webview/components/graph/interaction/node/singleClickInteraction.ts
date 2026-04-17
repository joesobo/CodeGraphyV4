import type { GraphInteractionEffect } from '../model';
import type { GraphNodeSingleClickOptions } from './singleClick';

function toPoint(x: number, y: number) {
  return { x, y };
}

export function buildNodeSingleClickInteractionEffect(
  options: GraphNodeSingleClickOptions,
): GraphInteractionEffect {
  return {
    kind: 'sendInteraction',
    event: 'graph:nodeClick',
    payload: {
      node: { id: options.nodeId, label: options.label },
      event: toPoint(options.clientX, options.clientY),
    },
  };
}
