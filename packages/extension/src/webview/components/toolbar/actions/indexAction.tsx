import React, { useEffect, useRef } from 'react';
import { mdiAutorenew } from '@mdi/js';
import { ToolbarIconButton } from '../IconButton';
import {
  clearPendingIndexTimeout,
  createRefreshConfig,
  requestGraphIndex,
} from './refresh';

interface IndexToolbarActionProps {
  graphHasIndex: boolean;
  graphIsIndexing: boolean;
}

export function IndexToolbarAction({
  graphHasIndex,
  graphIsIndexing,
}: IndexToolbarActionProps): React.ReactElement {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = createRefreshConfig(graphHasIndex);

  useEffect(() => {
    if (!graphIsIndexing) {
      clearPendingIndexTimeout(timeoutRef);
    }
  }, [graphIsIndexing]);

  useEffect(() => () => clearPendingIndexTimeout(timeoutRef), []);

  return (
    <ToolbarIconButton
      disabled={graphIsIndexing}
      iconPath={mdiAutorenew}
      onClick={() => requestGraphIndex(graphHasIndex, timeoutRef)}
      title={refresh.title}
    />
  );
}
