import { describe, expect, it } from 'vitest';
import { handleGraphScopeHydrationUpdated } from '../../../../src/webview/store/messageHandlers/graphScopeHydration';

describe('webview/store/messageHandlers/graphScopeHydration', () => {
  it('merges hydration state and clears completed scope rows', () => {
    expect(handleGraphScopeHydrationUpdated({
      type: 'GRAPH_SCOPE_HYDRATION_UPDATED',
      payload: { hydrating: true, scopeIds: ['symbol:function'] },
    }, { 'symbol:class': true })).toEqual({
      scopeHydrationPending: {
        'symbol:class': true,
        'symbol:function': true,
      },
    });

    expect(handleGraphScopeHydrationUpdated({
      type: 'GRAPH_SCOPE_HYDRATION_UPDATED',
      payload: { hydrating: false, scopeIds: ['symbol:function'] },
    }, { 'symbol:class': true, 'symbol:function': true })).toEqual({
      scopeHydrationPending: { 'symbol:class': true },
    });
  });
});
