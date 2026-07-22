import React from 'react';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import { useGraphViewContributions } from '../../../pluginHost/useGraphViewContributions';
import { useGraphStore } from '../../../store/state';
import { IndexToolbarAction } from './indexAction';
import { ToolbarPanelButtons } from './panelButtons';
import { GRAPH_TOOL_PANEL_BUTTONS, SYSTEM_PANEL_BUTTONS } from './model';
import { PluginToolbarActions } from '../plugin/Actions';
import { NodeSizeModePopover } from '../NodeSizeModePopover';
import { CreateToolbarAction } from './create';

export {
  getToolbarActionIconPath,
  getToolbarActionItemKey,
  getToolbarActionKey,
} from './model';

export function ToolbarActions({
  pluginHost,
}: {
  pluginHost?: WebviewPluginHost;
}): React.ReactElement {
  const activePanel = useGraphStore(s => s.activePanel);
  const setActivePanel = useGraphStore(s => s.setActivePanel);
  const pluginToolbarActions = useGraphStore(s => s.pluginToolbarActions);
  const graphViewContributions = useGraphViewContributions(pluginHost);
  const graphHasIndex = useGraphStore(s => s.graphHasIndex);
  const graphIndexFreshness = useGraphStore(s => s.graphIndexFreshness);
  const graphIndexDetail = useGraphStore(s => s.graphIndexDetail);
  const graphIsIndexing = useGraphStore(s => s.graphIsIndexing);

  return (
    <div className="flex flex-col items-center gap-2" data-codegraphy-region="toolbar-actions" data-testid="toolbar-actions">
      <div className="flex flex-col items-center gap-1.5" data-codegraphy-region="toolbar-lifecycle" data-testid="toolbar-lifecycle-group">
        <IndexToolbarAction
          graphHasIndex={graphHasIndex}
          graphIndexFreshness={graphIndexFreshness}
          graphIndexDetail={graphIndexDetail}
          graphIsIndexing={graphIsIndexing}
        />
      </div>
      <div className="h-px w-5 bg-[var(--cg-divider-subtle)]" aria-hidden="true" />
      <div className="flex flex-col items-center gap-1.5" data-codegraphy-region="toolbar-graph-tools" data-testid="toolbar-graph-tools-group">
        <NodeSizeModePopover />
        <CreateToolbarAction
          graphViewContributions={graphViewContributions}
        />
        <PluginToolbarActions pluginToolbarActions={pluginToolbarActions} />
        <ToolbarPanelButtons
          activePanel={activePanel}
          buttons={GRAPH_TOOL_PANEL_BUTTONS}
          setActivePanel={setActivePanel}
        />
      </div>
      <div className="h-px w-5 bg-[var(--cg-divider-subtle)]" aria-hidden="true" />
      <div className="flex flex-col items-center gap-1.5" data-codegraphy-region="toolbar-system" data-testid="toolbar-system-group">
        <ToolbarPanelButtons
          activePanel={activePanel}
          buttons={SYSTEM_PANEL_BUTTONS}
          setActivePanel={setActivePanel}
        />
      </div>
    </div>
  );
}
