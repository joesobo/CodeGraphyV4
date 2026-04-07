import type { GraphViewProviderMessageListenerSource } from './listener';

export function setPluginUserGroups(
  source: Pick<GraphViewProviderMessageListenerSource, '_userGroups'>,
  groups: GraphViewProviderMessageListenerSource['_userGroups'],
): void {
  source._userGroups = groups;
}

export function setPluginFilterPatterns(
  source: Pick<GraphViewProviderMessageListenerSource, '_filterPatterns'>,
  patterns: string[],
): void {
  source._filterPatterns = patterns;
}

export function setPluginWebviewReadyNotified(
  source: Pick<GraphViewProviderMessageListenerSource, '_webviewReadyNotified'>,
  readyNotified: boolean,
): void {
  source._webviewReadyNotified = readyNotified;
}
