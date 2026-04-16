import { beforeEach, describe, expect, it, vi } from 'vitest';

const bootstrapState = vi.hoisted(() => ({
  initializeCalls: [] as unknown[],
  restoreValue: {
    depthMode: true,
    dagMode: 'focus' as const,
    nodeSizeMode: 'connections' as const,
  },
}));

vi.mock('../../../../../src/extension/graphView/provider/runtimeBootstrap', () => ({
  initializeGraphViewProviderRuntimeServices: vi.fn((source) => {
    bootstrapState.initializeCalls.push(source);
  }),
  restoreGraphViewProviderRuntimeState: vi.fn(() => bootstrapState.restoreValue),
}));

import {
  getWorkspaceRoot,
  initializeRuntimeStateServices,
  restorePersistedRuntimeState,
} from '../../../../../src/extension/graphView/provider/runtime/stateBootstrap';

describe('graphView/provider/runtime/stateBootstrap', () => {
  beforeEach(() => {
    bootstrapState.initializeCalls = [];
    bootstrapState.restoreValue = {
      depthMode: true,
      dagMode: 'focus',
      nodeSizeMode: 'connections',
    };
  });

  it('builds the runtime bootstrap source with lazy graph data and method containers', () => {
    const dependencies = {
      _analyzer: {},
      _context: {},
      _viewRegistry: {},
      _eventBus: {},
      _decorationManager: {},
    } as never;
    const graphData = { nodes: [], edges: [] };
    const methodContainers = { refresh: {} };

    initializeRuntimeStateServices(
      dependencies,
      () => graphData,
      () => methodContainers as never,
    );

    expect(bootstrapState.initializeCalls).toHaveLength(1);
    expect(
      (bootstrapState.initializeCalls[0] as { _graphData: unknown })._graphData,
    ).toBe(graphData);
    expect(
      (bootstrapState.initializeCalls[0] as { getMethodContainers(): unknown }).getMethodContainers(),
    ).toBe(methodContainers);
  });

  it('delegates persisted-state restore and reads the first workspace root', () => {
    expect(restorePersistedRuntimeState({} as never, 'connections')).toEqual(
      bootstrapState.restoreValue,
    );
    expect(
      getWorkspaceRoot([
        {
          uri: {
            fsPath: '/test/workspace',
          },
        },
      ] as never),
    ).toBe('/test/workspace');
    expect(getWorkspaceRoot([undefined] as never)).toBeUndefined();
    expect(getWorkspaceRoot(undefined)).toBeUndefined();
  });
});
