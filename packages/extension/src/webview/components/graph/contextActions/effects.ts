import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { BuiltInContextMenuAction, GraphContextMenuAction } from '../contextMenu/contracts';
import { getBuiltInContextActionEffectsImpl } from './builtin/effects';
import { createPluginContextActionEffects } from './pluginEffects';

export type GraphContextEffect =
  | { kind: 'openFile'; path: string }
  | { kind: 'focusNode'; nodeId: string }
  | { kind: 'fitView' }
  | { kind: 'promptFilterPattern'; patterns: string[] }
  | { kind: 'promptLegendRule'; pattern: string; color: string; target: 'node' | 'edge' }
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
