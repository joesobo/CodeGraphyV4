import type { WebviewToExtensionMessage } from '../../../../shared/contracts';
import type { BuiltInContextMenuAction, GraphContextMenuAction } from '../../graphContextMenu/types';
import { getBuiltInContextActionEffectsImpl } from './builtinEffects';
import { createPluginContextActionEffects } from './pluginEffects';

export type GraphContextEffect =
  | { kind: 'openFile'; path: string }
  | { kind: 'focusNode'; nodeId: string }
  | { kind: 'fitView' }
  | { kind: 'postMessage'; message: WebviewToExtensionMessage };

export function getBuiltInContextActionEffects(
  action: BuiltInContextMenuAction,
  targetPaths: string[]
): GraphContextEffect[] {
  return getBuiltInContextActionEffectsImpl(action, targetPaths);
}

export function getGraphContextActionEffects(
  action: GraphContextMenuAction,
  targetPaths: string[]
): GraphContextEffect[] {
  if (action.kind === 'builtin') {
    return getBuiltInContextActionEffects(action.action, targetPaths);
  }

  return createPluginContextActionEffects(action);
}
