import type {
  GraphNodeClickCommand,
  GraphNodeClickOptions,
} from '../model';
import {
  getNodeDoubleClickCommand,
  isDoubleNodeClick,
} from './doubleClick';
import { getNodeSingleClickCommand } from './singleClick';

function isMacControlContextAction(
  ctrlKey: boolean,
  isMacPlatform: boolean,
): boolean {
  return isMacPlatform && ctrlKey;
}

export function getNodeClickCommand(
  options: GraphNodeClickOptions,
): GraphNodeClickCommand {
  if (isMacControlContextAction(options.ctrlKey, options.isMacPlatform)) {
    return {
      nextLastClick: options.lastClick,
      effects: [{ kind: 'openNodeContextMenu', nodeId: options.nodeId }],
    };
  }

  if (isDoubleNodeClick(options)) {
    return getNodeDoubleClickCommand(options);
  }

  return getNodeSingleClickCommand(options);
}
