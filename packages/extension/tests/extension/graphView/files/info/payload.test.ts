import { describe, expect, it } from 'vitest';
import { buildGraphViewFileInfoPayload } from '../../../../../src/extension/graphView/files/info/payload';

describe('graphViewFileInfo', () => {
  it('builds file info payloads with incoming and outgoing counts', () => {
    const payload = buildGraphViewFileInfoPayload(
      'src/app.ts',
      { size: 128, mtime: 42 },
      {
        nodes: [],
        edges: [
          { id: 'a', from: 'src/app.ts', to: 'src/lib.ts' },
          { id: 'b', from: 'src/lib.ts', to: 'src/app.ts' },
          { id: 'c', from: 'src/app.ts', to: 'src/util.ts' },
        ],
      },
      'TypeScript',
      5
    );

    expect(payload).toEqual({
      path: 'src/app.ts',
      size: 128,
      lastModified: 42,
      incomingCount: 1,
      outgoingCount: 2,
      plugin: 'TypeScript',
      visits: 5,
    });
  });

  it('builds file info payloads with zero counts when no edges match', () => {
    const payload = buildGraphViewFileInfoPayload(
      'src/app.ts',
      { size: 64, mtime: 7 },
      {
        nodes: [],
        edges: [{ id: 'a', from: 'src/other.ts', to: 'src/lib.ts' }],
      },
      undefined,
      0
    );

    expect(payload).toEqual({
      path: 'src/app.ts',
      size: 64,
      lastModified: 7,
      incomingCount: 0,
      outgoingCount: 0,
      plugin: undefined,
      visits: 0,
    });
  });
});
