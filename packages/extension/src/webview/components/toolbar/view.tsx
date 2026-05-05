import React from 'react';
import { TooltipProvider } from '../ui/overlay/tooltip';
import { ToolbarActions } from './actions/view';
import type { WebviewPluginHost } from '../../pluginHost/manager';
import { SlotHost } from '../../pluginHost/slotHost/view';

interface ToolbarProps {
  pluginHost?: WebviewPluginHost;
}

export default function Toolbar({ pluginHost }: ToolbarProps): React.ReactElement {
  return (
    <TooltipProvider delayDuration={300}>
      <div
        data-testid="toolbar"
        className="flex h-full min-h-0 flex-col items-center gap-2 bg-transparent"
      >
        <ToolbarActions />
        {pluginHost ? (
          <>
            <div className="h-px w-5 bg-[var(--cg-divider-subtle)]" aria-hidden="true" />
            <SlotHost
              pluginHost={pluginHost}
              slot="toolbar"
              data-testid="toolbar-plugin-slot"
              className="flex flex-col items-center gap-1.5"
            />
          </>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
