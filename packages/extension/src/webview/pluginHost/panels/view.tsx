import React, { useEffect, useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import type { WebviewPluginHost } from '../manager';

interface PluginPanelHostProps extends ComponentPropsWithoutRef<'div'> {
  pluginHost?: WebviewPluginHost;
}

export function PluginPanelHost({
  pluginHost,
  ...props
}: PluginPanelHostProps): React.ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pluginHost || !hostRef.current) return;
    pluginHost.attachPanelHost(hostRef.current);
    return () => pluginHost.detachPanelHost();
  }, [pluginHost]);

  return <div ref={hostRef} {...props} />;
}
