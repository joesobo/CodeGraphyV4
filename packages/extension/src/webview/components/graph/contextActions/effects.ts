import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { BuiltInContextMenuAction, GraphContextMenuAction } from '../contextMenu/contracts';
import type { GraphContextActionContext } from './context';
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
  context: GraphContextActionContext
): GraphContextEffect[] {
  return getBuiltInContextActionEffectsImpl(action, context);
}

export function getGraphContextActionEffects(
  action: GraphContextMenuAction,
  context: GraphContextActionContext
): GraphContextEffect[] {
  if (action.kind === 'builtin') {
    return getBuiltInContextActionEffects(action.action, context);
  }

  return createPluginContextActionEffects(action);
}
