import type {
  GraphNodeClickCommand,
  GraphNodeClickOptions,
} from '../model';
import {
  getNodeDoubleClickCommand,
  isDoubleNodeClick,
} from './doubleClick';
import { getNodeSingleClickCommand } from './singleClick/command';
import { isMacControlClick } from '../../support/modifiers';

export function getNodeClickCommand(
  options: GraphNodeClickOptions,
): GraphNodeClickCommand {
  if (isMacControlClick(options.ctrlKey, options.isMacPlatform)) {
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
