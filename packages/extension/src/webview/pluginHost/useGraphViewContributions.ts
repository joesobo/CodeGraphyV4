import { useCallback, useSyncExternalStore } from 'react';
import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type { WebviewPluginHost } from './manager';

export function useGraphViewContributions(
  pluginHost: WebviewPluginHost | undefined,
): ExtensionGraphViewContributionSet | undefined {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (!pluginHost) return () => undefined;
    const subscription = pluginHost.subscribeGraphViewContributions(onStoreChange);
    return () => subscription.dispose();
  }, [pluginHost]);
  const getSnapshot = useCallback(
    () => pluginHost?.getGraphViewContributions(),
    [pluginHost],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
