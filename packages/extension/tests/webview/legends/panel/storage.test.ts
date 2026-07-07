import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readLegendPanelCollapsedState,
  writeLegendPanelCollapsedState,
} from '../../../../src/webview/components/legends/panel/storage';

let mockState: unknown;
const setState = vi.fn((nextState: unknown) => {
  mockState = nextState;
});

vi.mock('../../../../src/webview/vscodeApi', () => ({
  getVsCodeApi: () => ({
    getState: () => mockState,
    setState,
  }),
}));

describe('webview/components/legends/panel/storage', () => {
  beforeEach(() => {
    mockState = undefined;
    setState.mockClear();
  });

  it('reads only boolean collapsed entries from webview state', () => {
    mockState = {
      legendPanelCollapsed: {
        'section:nodes': true,
        'section:edges': false,
        invalid: 'yes',
      },
    };

    expect(readLegendPanelCollapsedState()).toEqual({
      'section:nodes': true,
      'section:edges': false,
    });
  });

  it('returns an empty collapsed state when persisted webview state is not a JSON record', () => {
    mockState = new Date('2026-01-01T00:00:00.000Z');

    expect(readLegendPanelCollapsedState()).toEqual({});
  });

  it('merges collapsed entries back into the existing webview state', () => {
    mockState = { keep: 'value' };

    writeLegendPanelCollapsedState({ 'section:nodes': true });

    expect(setState).toHaveBeenCalledWith({
      keep: 'value',
      legendPanelCollapsed: {
        'section:nodes': true,
      },
    });
  });
});
