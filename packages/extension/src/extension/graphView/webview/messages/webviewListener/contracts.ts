import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type { IGroup } from '../../../../../shared/settings/groups';
import type {
  dispatchGraphViewPluginMessage,
  GraphViewPluginMessageContext,
} from '../../dispatch/plugin';
import type {
  dispatchGraphViewPrimaryMessage,
  GraphViewPrimaryMessageContext,
} from '../../dispatch/primary';

export interface GraphViewMessageListenerContext
  extends GraphViewPrimaryMessageContext,
    GraphViewPluginMessageContext {
  reprocessPluginFiles(pluginIds: readonly string[]): Promise<void>;
  setUserGroups(groups: IGroup[]): void;
  setFilterPatterns(patterns: string[]): void;
  setWebviewReadyNotified(nextValue: boolean): void;
}

export type GraphViewPrimaryMessageResult =
  Awaited<ReturnType<typeof dispatchGraphViewPrimaryMessage>>;
export type GraphViewPluginMessageResult =
  Awaited<ReturnType<typeof dispatchGraphViewPluginMessage>>;
export type WebviewReadyMessage = Extract<WebviewToExtensionMessage, { type: 'WEBVIEW_READY' }>;

export interface WebviewReadyDelivery {
  pageId?: string;
  postedAt?: number;
}

export interface WebviewReadyTracking {
  completedAt?: number;
  handled: boolean;
  pageId?: string;
}
