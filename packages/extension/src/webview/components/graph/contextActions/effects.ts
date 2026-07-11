import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { BuiltInContextMenuAction, GraphContextMenuAction } from '../contextMenu/contracts';
import type { GraphContextActionContext } from './context';
import { getBuiltInContextActionEffectsImpl } from './builtin/effects';
import { createPluginContextActionEffects } from './pluginEffects';

export type GraphContextEffect =
  | { kind: 'openFile'; path: string }
  | { kind: 'focusNode'; nodeId: string }
  | { kind: 'fitView' }
  | { kind: 'beginInlineRename'; path: string }
  | { kind: 'beginInlineCreate'; itemKind: 'file' | 'folder'; directory: string }
  | { kind: 'setCompareSelectedPath'; path: string | null }
  | { kind: 'promptFilterPattern'; patterns: string[] }
  | { kind: 'promptLegendRule'; pattern: string; color: string; target: 'node' | 'edge' }
  | { kind: 'postMessage'; message: WebviewToExtensionMessage }
  | {
      kind: 'runGraphViewContextMenuContribution';
      run: Extract<GraphContextMenuAction, { kind: 'graphViewPlugin' }>['run'];
      context: Extract<GraphContextMenuAction, { kind: 'graphViewPlugin' }>['context'];
    };

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
    return getBuiltInContextActionEffects(action.action, {
      ...context,
      comparisonPath: action.comparisonPath,
    });
  }

  if (action.kind === 'graphViewPlugin') {
    return [{
      kind: 'runGraphViewContextMenuContribution',
      run: action.run,
      context: action.context,
    }];
  }

  return createPluginContextActionEffects(action);
}
