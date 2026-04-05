import React, { useEffect, useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import type { GraphPluginSlot } from '../api/contracts';
import type { WebviewPluginHost } from '../manager';

interface SlotHostProps extends ComponentPropsWithoutRef<'div'> {
  pluginHost: WebviewPluginHost;
  slot: GraphPluginSlot;
}

export function SlotHost({
  pluginHost,
  slot,
  ...props
}: SlotHostProps): React.ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    pluginHost.attachSlotHost(slot, host);
    return () => {
      pluginHost.detachSlotHost(slot);
    };
  }, [pluginHost, slot]);

  return <div ref={hostRef} {...props} />;
}
