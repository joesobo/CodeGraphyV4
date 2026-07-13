import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../../../src/shared/settings/physics';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';

const workerFactory = vi.hoisted(() => vi.fn());

vi.mock('../../../../../../src/webview/components/graph/rendering/surface/owned2d/worker/host', () => ({
  createWorkerHostedGraphLayoutEngine: workerFactory,
}));

import {
  createOwnedGraphLayout,
  updateOwnedGraphLayout,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { createGraphLayoutEngine } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';

const SETTINGS: IPhysicsSettings = {
  centerForce: 0.1,
  damping: 0.4,
  linkDistance: 80,
  linkForce: 1,
  repelForce: 10,
};

function node(): FGNode {
  return {
    baseOpacity: 1,
    borderColor: '#000000',
    borderWidth: 1,
    color: '#ffffff',
    id: 'a',
    isFavorite: false,
    isPinned: false,
    label: 'a',
    size: 4,
  };
}

describe('owned graph worker selection', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', class {});
    workerFactory.mockImplementation(input => createGraphLayoutEngine(input));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('uses worker-hosted physics even for one-node graphs', () => {
    const layout = createOwnedGraphLayout([node()], [], SETTINGS);

    expect(layout.kind).toBe('worker');
    expect(workerFactory).toHaveBeenCalledOnce();
  });

  it('uses synchronous physics only when Worker is unavailable', () => {
    vi.unstubAllGlobals();

    const layout = createOwnedGraphLayout([node()], [], SETTINGS);

    expect(layout.kind).toBe('main-thread');
    expect(workerFactory).not.toHaveBeenCalled();
  });

  it('falls back synchronously when worker construction fails', () => {
    workerFactory.mockImplementation(() => {
      throw new Error('worker blocked');
    });

    const layout = createOwnedGraphLayout([node()], [], SETTINGS);

    expect(layout.kind).toBe('main-thread');
    expect(layout.engine.x).toHaveLength(1);
    expect(updateOwnedGraphLayout(layout, [node()], [], SETTINGS)).toBe(true);
    expect(workerFactory).toHaveBeenCalledOnce();
  });
});
