import React from 'react';
import SettingsPanel from '../../components/settingsPanel/Drawer';
import PluginsPanel from '../../components/plugins/Panel';
import LegendsPanel from '../../components/legends/panel/view';
import NodesPanel from '../../components/nodes/Panel';
import EdgesPanel from '../../components/edges/Panel';
import ExportPanel from '../../components/export/Panel';
import { SlotHost } from '../../pluginHost/slotHost/view';
import { GraphCornerControls } from '../../components/graphCornerControls/view';

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
    <div className="absolute top-2 bottom-2 right-2 z-10 flex flex-col justify-end pointer-events-none [&>*]:pointer-events-auto">
      <SlotHost
        pluginHost={pluginHost}
        slot="node-details"
        data-testid="node-details-slot"
        className="bg-popover/95 backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden mb-2"
      />
      <NodesPanel isOpen={activePanel === 'nodes'} onClose={onClosePanel} />
      <EdgesPanel isOpen={activePanel === 'edges'} onClose={onClosePanel} />
      <LegendsPanel isOpen={activePanel === 'legends'} onClose={onClosePanel} />
      <ExportPanel isOpen={activePanel === 'export'} onClose={onClosePanel} />
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
