import React from 'react';
import SettingsPanel from '../../../components/settingsPanel/Drawer';
import PluginsPanel from '../../../components/plugins/Panel';
import LegendsPanel from '../../../components/legends/panel/view';
import GraphScopePanel from '../../../components/graphScope/Panel';
import { SlotHost } from '../../../pluginHost/slotHost/view';
import { GraphCornerControls } from '../../../components/graphCornerControls/view';

type SlotHostProps = React.ComponentProps<typeof SlotHost>;

export interface PanelStackProps {
  activePanel: string;
  hasGraphNodes: boolean;
  pluginHost: SlotHostProps['pluginHost'];
  onClosePanel: () => void;
}

export function PanelStack({
  activePanel,
  hasGraphNodes,
  pluginHost,
  onClosePanel,
}: PanelStackProps): React.ReactElement {
  return (
    <div className="absolute top-2 bottom-2 right-2 z-30 flex flex-col justify-end pointer-events-none [&>*]:pointer-events-auto">
      <SlotHost
        pluginHost={pluginHost}
        slot="graph.panelSlot"
        data-testid="graph-panel-slot"
        className="bg-[var(--cg-popover-translucent)] backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden mb-2"
      />
      <SlotHost
        pluginHost={pluginHost}
        slot="node-details"
        data-testid="node-details-slot"
        className="bg-[var(--cg-popover-translucent)] backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden mb-2"
      />
      <GraphScopePanel isOpen={activePanel === 'graphScope'} onClose={onClosePanel} />
      <LegendsPanel isOpen={activePanel === 'legends'} onClose={onClosePanel} />
      <PluginsPanel isOpen={activePanel === 'plugins'} onClose={onClosePanel} />
      <SettingsPanel isOpen={activePanel === 'settings'} onClose={onClosePanel} />
      {hasGraphNodes && activePanel === 'none' ? (
        <div className="mt-2 self-end">
          <GraphCornerControls />
        </div>
      ) : null}
    </div>
  );
}
