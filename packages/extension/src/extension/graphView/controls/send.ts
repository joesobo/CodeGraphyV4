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

function isEdgeFromDisabledPlugin(
  edge: IGraphData['edges'][number],
  disabledPlugins: ReadonlySet<string>,
): boolean {
  return edge.sources.length > 0
    && edge.sources.every(source => source.pluginId && disabledPlugins.has(source.pluginId));
}

function filterDisabledPluginEdgesForControls(
  graphData: IGraphData,
  disabledPlugins: ReadonlySet<string>,
): IGraphData {
  if (disabledPlugins.size === 0) {
    return graphData;
  }

  return {
    ...graphData,
    edges: graphData.edges.filter(edge => !isEdgeFromDisabledPlugin(edge, disabledPlugins)),
  };
}

export function sendGraphControlsUpdated(
  graphData: IGraphData,
  analyzer: GraphControlsAnalyzerLike | undefined,
  sendMessage: (message: ExtensionToWebviewMessage) => void,
  config: GraphControlsConfigurationLike = getCodeGraphyConfiguration(),
  disabledPlugins: ReadonlySet<string> = new Set(),
): void {
  const registry = analyzer?.registry;
  const controlsGraphData = filterDisabledPluginEdgesForControls(graphData, disabledPlugins);
  const filePaths = controlsGraphData.nodes
    .filter(isFileNode)
    .map((node) => node.id);

  sendMessage(
    buildGraphControlsUpdatedMessage(
      captureGraphControlsSnapshot(
        config,
        controlsGraphData,
        readNodeTypes(registry, disabledPlugins),
        readEdgeTypes(registry, disabledPlugins),
        readEdgeTypeCapabilities(registry, filePaths, disabledPlugins),
      ),
    ),
  );
}
