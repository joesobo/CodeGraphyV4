import React from 'react';
import { ToolbarIconButton } from '../IconButton';
import type { GraphState } from '../../../store/state';
import {
  TOOLBAR_PANEL_BUTTONS,
  type ToolbarPanel,
} from './model';

type ToolbarPanelButton = {
  iconPath: string;
  panel: ToolbarPanel;
  title: string;
};

interface ToolbarPanelButtonsProps {
  activePanel: GraphState['activePanel'];
  buttons?: ToolbarPanelButton[];
  setActivePanel: (panel: GraphState['activePanel']) => void;
}

function getNextPanel(
  activePanel: GraphState['activePanel'],
  panel: ToolbarPanel,
): GraphState['activePanel'] {
  return activePanel === panel ? 'none' : panel;
}

export function ToolbarPanelButtons({
  activePanel,
  buttons = TOOLBAR_PANEL_BUTTONS,
  setActivePanel,
}: ToolbarPanelButtonsProps): React.ReactElement {
  return (
    <>
      {buttons.map((button) => (
        <ToolbarIconButton
          key={button.panel}
          active={activePanel === button.panel}
          iconPath={button.iconPath}
          onClick={() => setActivePanel(getNextPanel(activePanel, button.panel))}
          title={button.title}
        />
      ))}
    </>
  );
}
