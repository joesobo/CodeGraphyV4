import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type {
  GraphViewProviderRefreshMethodDependencies,
  GraphViewProviderRefreshMethodsSource,
} from '../refresh';

export function createRebuildSenders(
  source: GraphViewProviderRefreshMethodsSource,
  dependencies: GraphViewProviderRefreshMethodDependencies,
): {
  rebuildAndSend(): void;
  smartRebuild(id: string): void;
} {
  const rebuildAndSend = (): void => {
    dependencies.rebuildGraphData(source, {
      getShowOrphans: () => dependencies.getShowOrphans(),
      computeMergedGroups: () => source._computeMergedGroups(),
      sendGroupsUpdated: () => source._sendGroupsUpdated(),
      updateViewContext: () => source._updateViewContext(),
      applyViewTransform: () => source._applyViewTransform(),
      sendDepthState: () => source._sendDepthState(),
      sendGraphControls: () => source._sendGraphControls?.(),
      sendPluginStatuses: () => source._sendPluginStatuses(),
      sendDecorations: () => source._sendDecorations(),
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
    });
  };

  const runSourceRebuild = (): void => {
    const implementation = source._rebuildAndSend;
    if (implementation) {
      implementation();
      return;
    }

    rebuildAndSend();
  };

  return {
    rebuildAndSend,
    smartRebuild: (id: string) => {
      dependencies.smartRebuildGraphData(source, id, {
        rebuildAndSend: () => runSourceRebuild(),
      });
    },
  };
}
