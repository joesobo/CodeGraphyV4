import React, { useEffect, useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import type { GraphPluginSlot } from '../api/contracts/types';
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
    pluginHost.attachSlotHost(slot, hostRef.current!);
    return () => {
      pluginHost.detachSlotHost(slot);
    };
  }, [pluginHost, slot]);

  return <div ref={hostRef} {...props} />;
}
