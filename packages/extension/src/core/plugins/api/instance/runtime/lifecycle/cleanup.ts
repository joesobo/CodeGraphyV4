import type { ApiContext } from '../state/context';

type CleanupContext = Pick<
  ApiContext,
  | 'eventBus'
  | 'decorationManager'
  | 'pluginId'
  | 'disposables'
  | 'commands'
  | 'contextMenuItems'
  | 'exporters'
  | 'toolbarActions'
  | 'webviewMessageHandlers'
>;

export function disposePluginApi(context: CleanupContext): void {
  context.eventBus.removeAllForPlugin(context.pluginId);
  context.decorationManager.clearDecorations(context.pluginId);
  context.disposables.dispose();
  context.commands.length = 0;
  context.contextMenuItems.length = 0;
  context.exporters.length = 0;
  context.toolbarActions.length = 0;
  context.webviewMessageHandlers.clear();
}
