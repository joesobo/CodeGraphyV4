import { describe, expect, it } from 'vitest';
import { getFileInfoEffects } from '../../../../../src/webview/components/graph/messages/fileInfo/effects';

describe('graph/messages/fileInfo/effects', () => {
  it('creates file info effects for matching and non-matching tooltips', () => {
    const info = {
      path: 'src/app.ts',
      size: 123,
      lastModified: 1704067200000,
      incomingCount: 2,
      outgoingCount: 3,
    };

    expect(getFileInfoEffects('src/app.ts', info)).toEqual([
      { kind: 'cacheFileInfo', info },
      { kind: 'updateTooltipInfo', info },
    ]);
    expect(getFileInfoEffects('src/utils.ts', info)).toEqual([
      { kind: 'cacheFileInfo', info },
    ]);
  });
});
