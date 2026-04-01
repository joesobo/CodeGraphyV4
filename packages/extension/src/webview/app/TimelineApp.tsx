import React, { useEffect } from 'react';
import Timeline from '../components/Timeline';
import { usePluginManager } from '../pluginRuntime/useManager';
import { getNoDataHint } from './messages';
import { setupMessageListener } from './messageListener';
import { LoadingState, EmptyState } from './states';
import { useAppState } from './storeSelectors';

export default function TimelineApp(): React.ReactElement {
  const { pluginHost, injectPluginAssets } = usePluginManager();
  const { graphData, isLoading, showOrphans, timelineActive } = useAppState();

  useEffect(() => {
    return setupMessageListener(injectPluginAssets, pluginHost);
  }, [injectPluginAssets, pluginHost]);

  if (isLoading) return <LoadingState />;

  if (!timelineActive && (!graphData || graphData.nodes.length === 0)) {
    return <EmptyState hint={getNoDataHint(graphData, showOrphans)} />;
  }

  return (
    <div className="w-full">
      <Timeline />
    </div>
  );
}
