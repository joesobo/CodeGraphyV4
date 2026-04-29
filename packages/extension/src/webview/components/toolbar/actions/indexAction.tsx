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
  graphIndexFreshness: 'fresh' | 'stale' | 'missing';
  graphIndexDetail: string | null;
  graphIsIndexing: boolean;
}

export function IndexToolbarAction({
  graphHasIndex,
  graphIndexFreshness,
  graphIndexDetail,
  graphIsIndexing,
}: IndexToolbarActionProps): React.ReactElement {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = createRefreshConfig(graphHasIndex, graphIndexFreshness);

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
      onClick={() => requestGraphIndex(graphHasIndex, graphIndexFreshness, timeoutRef)}
      title={refresh.title}
      description={graphIndexFreshness === 'stale' ? (graphIndexDetail ?? undefined) : undefined}
      statusDot={graphIndexFreshness === 'stale'}
    />
  );
}
