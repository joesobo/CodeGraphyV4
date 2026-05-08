import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import { getCodeGraphyConfiguration } from '../../repoSettings/current';
import {
  createDefaultGraphLayoutSettings,
  normalizeGraphLayoutSettings,
} from '../../repoSettings/graphLayout/model';

export function createGraphLayoutUpdatedMessage(): Extract<
  ExtensionToWebviewMessage,
  { type: 'GRAPH_LAYOUT_UPDATED' }
> {
  const configuration = getCodeGraphyConfiguration();
  return {
    type: 'GRAPH_LAYOUT_UPDATED',
    payload: normalizeGraphLayoutSettings(
      configuration.get('graphLayout', createDefaultGraphLayoutSettings()),
    ),
  };
}
