import { describe, expect, it } from 'vitest';
import {
  getAccessCountEffects,
  getFileInfoEffects,
} from '../../../../src/webview/components/graph/messages/effects/fileInfo';

describe('graph/messages/effects/fileInfo', () => {
  it('creates file info effects for matching and non-matching tooltips', () => {
    const info = {
      path: 'src/app.ts',
      size: 123,
      lastModified: 1704067200000,
      incomingCount: 2,
      outgoingCount: 3,
      visits: 4,
    };

    expect(getFileInfoEffects('src/app.ts', info)).toEqual([
      { kind: 'cacheFileInfo', info },
      { kind: 'updateTooltipInfo', info },
    ]);
    expect(getFileInfoEffects('src/utils.ts', info)).toEqual([
      { kind: 'cacheFileInfo', info },
    ]);
  });

  it('creates access count update effects', () => {
    expect(getAccessCountEffects({ nodeId: 'src/app.ts', accessCount: 7 })).toEqual([
      { kind: 'updateAccessCount', nodeId: 'src/app.ts', accessCount: 7 },
    ]);
  });
});
