import { describe, expect, it, vi } from 'vitest';
import {
  persistGhostGraph,
  readPersistedGhostGraph,
} from '../../../../src/webview/components/graph/ghostGraph/persistence';

describe('graph/ghostGraph/persistence', () => {
  it('persists live node positions while preserving other webview state', () => {
    const storage = {
      getState: vi.fn(() => ({ other: 'state' })),
      setState: vi.fn(),
    };

    persistGhostGraph({
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#fff' }],
      edges: [],
    }, [{ id: 'src/app.ts', x: 12, y: 34 }], storage);

    expect(storage.setState).toHaveBeenCalledWith({
      other: 'state',
      codegraphyGhostGraph: {
        version: 1,
        graph: {
          nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#fff', x: 12, y: 34 }],
          edges: [],
        },
      },
    });
  });

  it('restores only a valid versioned graph snapshot', () => {
    const graph = {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#fff', x: 12, y: 34 }],
      edges: [],
    };
    expect(readPersistedGhostGraph({
      getState: () => ({ codegraphyGhostGraph: { version: 1, graph } }),
      setState: vi.fn(),
    })).toEqual(graph);
    expect(readPersistedGhostGraph({
      getState: () => ({ codegraphyGhostGraph: { version: 2, graph } }),
      setState: vi.fn(),
    })).toBeNull();
  });
});
