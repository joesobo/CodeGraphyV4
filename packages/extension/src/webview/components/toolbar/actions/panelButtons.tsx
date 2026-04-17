import React from 'react';
import { ToolbarIconButton } from '../IconButton';
import {
  TOOLBAR_PANEL_BUTTONS,
  type ToolbarPanel,
} from './model';

interface ToolbarPanelButtonsProps {
  activePanel: ToolbarPanel | 'none';
  setActivePanel: (panel: ToolbarPanel | 'none') => void;
}

function getNextPanel(
  activePanel: ToolbarPanel | 'none',
  panel: ToolbarPanel,
): ToolbarPanel | 'none' {
  return activePanel === panel ? 'none' : panel;
}

export function ToolbarPanelButtons({
  activePanel,
  setActivePanel,
}: ToolbarPanelButtonsProps): React.ReactElement {
  return (
    <>
      {TOOLBAR_PANEL_BUTTONS.map((button) => (
        <ToolbarIconButton
          key={button.panel}
          iconPath={button.iconPath}
          onClick={() => setActivePanel(getNextPanel(activePanel, button.panel))}
          title={button.title}
        />
      ))}
    </>
  );
}
