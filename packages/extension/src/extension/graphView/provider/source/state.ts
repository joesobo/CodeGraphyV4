import type {
  GraphViewProviderMethodSource,
  GraphViewProviderMethodSourceOwner,
} from './contracts';
import { attachMutableAccessors, attachReadonlyAccessors } from './accessors';

const MUTABLE_STATE_KEYS = [
  '_view',
  '_timelineView',
  '_panels',
  '_graphData',
  '_analyzer',
  '_analyzerInitialized',
  '_analyzerInitPromise',
  '_analysisController',
  '_analysisRequestId',
  '_activeViewId',
  '_dagMode',
  '_nodeSizeMode',
  '_rawGraphData',
  '_viewContext',
  '_groups',
  '_userGroups',
  '_hiddenPluginGroupIds',
  '_filterPatterns',
  '_disabledSources',
  '_disabledPlugins',
  '_gitAnalyzer',
  '_currentCommitSha',
  '_timelineActive',
  '_firstAnalysis',
  '_resolveFirstWorkspaceReady',
  '_webviewReadyNotified',
  '_indexingController',
] as const satisfies readonly Extract<
  keyof GraphViewProviderMethodSource & keyof GraphViewProviderMethodSourceOwner,
  string
>[];

const READONLY_STATE_KEYS = [
  '_viewRegistry',
  '_eventBus',
  '_decorationManager',
  '_firstWorkspaceReadyPromise',
  '_pluginExtensionUris',
  '_installedPluginActivationPromise',
  '_extensionUri',
  '_context',
] as const satisfies readonly Extract<
  keyof GraphViewProviderMethodSource & keyof GraphViewProviderMethodSourceOwner,
  string
>[];

export function createGraphViewProviderMethodStateSource(
  owner: GraphViewProviderMethodSourceOwner,
): Pick<
  GraphViewProviderMethodSource,
  (typeof MUTABLE_STATE_KEYS)[number] | (typeof READONLY_STATE_KEYS)[number]
> {
  const source = {} as Pick<
    GraphViewProviderMethodSource,
    (typeof MUTABLE_STATE_KEYS)[number] | (typeof READONLY_STATE_KEYS)[number]
  >;

  attachMutableAccessors(source, owner, MUTABLE_STATE_KEYS);
  attachReadonlyAccessors(source, owner, READONLY_STATE_KEYS);

  return source;
}
