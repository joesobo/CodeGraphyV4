import React from 'react';
import { useGraphStore } from '../../../store/state';
import { IndexToolbarAction } from './indexAction';
import { ToolbarPanelButtons } from './panelButtons';
import { PluginToolbarActions } from '../plugin/Actions';

export {
  getToolbarActionIconPath,
  getToolbarActionItemKey,
  getToolbarActionKey,
} from './model';

export function ToolbarActions(): React.ReactElement {
  const activePanel = useGraphStore(s => s.activePanel);
  const setActivePanel = useGraphStore(s => s.setActivePanel);
  const pluginToolbarActions = useGraphStore(s => s.pluginToolbarActions);
  const graphHasIndex = useGraphStore(s => s.graphHasIndex);
  const graphIndexFreshness = useGraphStore(s => s.graphIndexFreshness);
  const graphIndexDetail = useGraphStore(s => s.graphIndexDetail);
  const graphIsIndexing = useGraphStore(s => s.graphIsIndexing);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <IndexToolbarAction
        graphHasIndex={graphHasIndex}
        graphIndexFreshness={graphIndexFreshness}
        graphIndexDetail={graphIndexDetail}
        graphIsIndexing={graphIsIndexing}
      />
      <PluginToolbarActions pluginToolbarActions={pluginToolbarActions} />
      <ToolbarPanelButtons activePanel={activePanel} setActivePanel={setActivePanel} />
    </div>
  );
}
