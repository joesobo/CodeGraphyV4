import type { IGraphData } from '../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { IGraphControlsSnapshot } from '../../../shared/graphControls/contracts';
import { isFileNode } from '../../../shared/visibleGraph/model';
import { getCodeGraphyConfiguration } from '../../repoSettings/current';
import {
  readEdgeTypeCapabilities,
  readEdgeTypes,
  readNodeTypes,
} from './send/definitions/registry';
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
  const registry = analyzer?.registry;
  const filePaths = graphData.nodes
    .filter(isFileNode)
    .map((node) => node.id);

  sendMessage(
    buildGraphControlsUpdatedMessage(
      captureGraphControlsSnapshot(
        config,
        graphData,
        readNodeTypes(registry),
        readEdgeTypes(registry),
        readEdgeTypeCapabilities(registry, filePaths),
      ),
    ),
  );
}
