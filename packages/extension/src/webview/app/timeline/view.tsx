import React, { useEffect } from 'react';
import Timeline from '../../components/timeline/panel';
import { usePluginManager } from '../../pluginRuntime/useManager';
import { setupMessageListener } from '../shell/messageListener';

export default function TimelineApp(): React.ReactElement {
  const { pluginHost, injectPluginAssets } = usePluginManager();

  useEffect(() => {
    return setupMessageListener(injectPluginAssets, pluginHost);
  }, [injectPluginAssets, pluginHost]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <Timeline pluginHost={pluginHost} />
    </div>
  );
}
