import { useCallback, useSyncExternalStore } from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { WebviewPluginHost } from './manager';

export function useGraphViewContributions(
  pluginHost: WebviewPluginHost | undefined,
): CoreGraphViewContributionSet | undefined {
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
