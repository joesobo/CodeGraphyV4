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
    <aside
      className="absolute top-2 bottom-2 right-2 z-30 flex flex-col justify-end pointer-events-none [&>*]:pointer-events-auto"
      data-codegraphy-region="graph-panel-stack"
    >
      <SlotHost
        pluginHost={pluginHost}
        slot="graph.panelSlot"
        data-codegraphy-slot="graph-panel"
        data-testid="graph-panel-slot"
        className="bg-[var(--cg-popover-translucent)] backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden mb-2"
      />
      <SlotHost
        pluginHost={pluginHost}
        slot="node-details"
        data-codegraphy-slot="node-details"
        data-testid="node-details-slot"
        className="bg-[var(--cg-popover-translucent)] backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden mb-2"
      />
      <GraphScopePanel isOpen={activePanel === 'graphScope'} onClose={onClosePanel} />
      <LegendsPanel isOpen={activePanel === 'legends'} onClose={onClosePanel} pluginHost={pluginHost} />
      <PluginsPanel isOpen={activePanel === 'plugins'} onClose={onClosePanel} />
      <SettingsPanel isOpen={activePanel === 'settings'} onClose={onClosePanel} />
      {hasGraphNodes && activePanel === 'none' ? (
        <div className="mt-2 self-end" data-codegraphy-region="graph-corner-controls">
          <GraphCornerControls />
        </div>
      ) : null}
    </aside>
  );
}
