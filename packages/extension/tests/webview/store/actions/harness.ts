import { vi } from 'vitest';
import { INITIAL_STATE } from '../../../../src/webview/store/initialState';
import { createActions } from '../../../../src/webview/store/actions/create';
import type { GraphState } from '../../../../src/webview/store/state';

const actionHarness = vi.hoisted(() => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: actionHarness.postMessage,
}));

export const graphData = { nodes: [], edges: [] } as NonNullable<GraphState['graphData']>;

export function getActionHarness() {
  return actionHarness;
}

export function createHarness(overrides: Partial<GraphState> = {}) {
  let state = {
    ...INITIAL_STATE,
    legends: [
      { id: 'plugin:typescript', pattern: '*.ts', color: '#3178C6', isPluginDefault: true },
      { id: 'existing', pattern: 'src/**', color: '#22C55E' },
    ],
    ...overrides,
  } as GraphState;

  const set = vi.fn((update: Parameters<typeof createActions>[0] | Partial<GraphState>) => {
    if (typeof update === 'function') {
      state = { ...state, ...(update as (current: GraphState) => Partial<GraphState>)(state) };
      return;
    }

    state = { ...state, ...update };
  });
  const get = vi.fn(() => state);

  return {
    get,
    getState: () => state,
    set,
    actions: createActions(set as never, get as never),
  };
}
