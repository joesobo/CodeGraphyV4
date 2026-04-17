import React from 'react';
import { useGraphStore } from '../../store/state';
import { IndexToolbarAction } from './IndexAction';
import { ToolbarPanelButtons } from './PanelButtons';
import { PluginToolbarActions } from './plugin/Actions';

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
  const graphIsIndexing = useGraphStore(s => s.graphIsIndexing);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <IndexToolbarAction
        graphHasIndex={graphHasIndex}
        graphIsIndexing={graphIsIndexing}
      />
      <PluginToolbarActions pluginToolbarActions={pluginToolbarActions} />
      <ToolbarPanelButtons activePanel={activePanel} setActivePanel={setActivePanel} />
    </div>
  );
}
