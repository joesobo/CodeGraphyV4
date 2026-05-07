import React from 'react';
import { mdiVectorSquarePlus } from '@mdi/js';
import {
  DEFAULT_GRAPH_SECTION_COLOR,
  DEFAULT_GRAPH_SECTION_HEIGHT,
  DEFAULT_GRAPH_SECTION_WIDTH,
} from '../../../../shared/settings/graphLayout';
import { postMessage } from '../../../vscodeApi';
import { ToolbarIconButton } from '../IconButton';

interface GraphSectionToolbarActionProps {
  graphMode: '2d' | '3d';
  timelineActive: boolean;
}

export function GraphSectionToolbarAction({
  graphMode,
  timelineActive,
}: GraphSectionToolbarActionProps): React.ReactElement | null {
  if (timelineActive || graphMode !== '2d') {
    return null;
  }

  return (
    <ToolbarIconButton
      iconPath={mdiVectorSquarePlus}
      onClick={() => postMessage({
        type: 'CREATE_GRAPH_LAYOUT_SECTION',
        payload: {
          color: DEFAULT_GRAPH_SECTION_COLOR,
          height: DEFAULT_GRAPH_SECTION_HEIGHT,
          memberNodeIds: [],
          width: DEFAULT_GRAPH_SECTION_WIDTH,
          x: -(DEFAULT_GRAPH_SECTION_WIDTH / 2),
          y: -(DEFAULT_GRAPH_SECTION_HEIGHT / 2),
        },
      })}
      title="New Graph Section"
    />
  );
}
