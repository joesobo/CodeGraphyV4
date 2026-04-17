import type { IGraphData } from '../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { IGraphControlsSnapshot } from '../../../shared/graphControls/types';
import { getCodeGraphyConfiguration } from '../../repoSettings/current';
import { readEdgeTypes, readNodeTypes } from './send/definitions/registry';
import { captureGraphControlsSnapshot } from './send/definitions/snapshot';
import type {
  GraphControlsAnalyzerLike,
  GraphControlsConfigurationLike,
} from './send/definitions/contracts';

export { captureGraphControlsSnapshot } from './send/definitions/snapshot';

export function buildGraphControlsUpdatedMessage(
  snapshot: IGraphControlsSnapshot,
): Extract<ExtensionToWebviewMessage, { type: 'GRAPH_CONTROLS_UPDATED' }> {
  return {
    type: 'GRAPH_CONTROLS_UPDATED',
    payload: snapshot,
  };
}

export function sendGraphControlsUpdated(
  graphData: IGraphData,
  analyzer: GraphControlsAnalyzerLike | undefined,
  sendMessage: (message: ExtensionToWebviewMessage) => void,
  config: GraphControlsConfigurationLike = getCodeGraphyConfiguration(),
): void {
  sendMessage(
    buildGraphControlsUpdatedMessage(
      captureGraphControlsSnapshot(
        config,
        graphData,
        readNodeTypes(analyzer?.registry),
        readEdgeTypes(analyzer?.registry),
      ),
    ),
  );
}
