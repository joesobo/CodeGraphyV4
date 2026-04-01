import React, { useEffect } from 'react';
import Timeline from '../components/Timeline';
import { usePluginManager } from '../pluginRuntime/useManager';
import { setupMessageListener } from './messageListener';

export default function TimelineApp(): React.ReactElement {
  const { pluginHost, injectPluginAssets } = usePluginManager();

  useEffect(() => {
    return setupMessageListener(injectPluginAssets, pluginHost);
  }, [injectPluginAssets, pluginHost]);

  return (
    <div className="inline-flex w-full flex-col overflow-hidden">
      <Timeline />
    </div>
  );
}
