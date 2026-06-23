import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphViewPrimaryMessageResult } from '../../../../../../src/extension/graphView/webview/dispatch/primary';
import { dispatchGraphViewPrimaryMessage } from '../../../../../../src/extension/graphView/webview/dispatch/primary';
import { createPrimaryMessageContext } from '../context';

const primaryDispatchMocks = vi.hoisted(() => ({
  route: vi.fn(),
  stateful: vi.fn(),
}));

vi.mock('../../../../../../src/extension/graphView/webview/dispatch/routed', () => ({
  dispatchGraphViewPrimaryRouteMessage: primaryDispatchMocks.route,
}));

vi.mock('../../../../../../src/extension/graphView/webview/dispatch/stateful', () => ({
  dispatchGraphViewPrimaryStateMessage: primaryDispatchMocks.stateful,
}));

describe('graph view primary message dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    primaryDispatchMocks.route.mockReset();
    primaryDispatchMocks.stateful.mockReset();
  });

  it('returns the routed result when the routed handlers handle the message', async () => {
    const context = createPrimaryMessageContext();
    const routedResult: GraphViewPrimaryMessageResult = { handled: true };
    primaryDispatchMocks.route.mockResolvedValue(routedResult);

    await expect(
      dispatchGraphViewPrimaryMessage({ type: 'NODE_SELECTED', payload: { nodeId: 'src/app.ts' } }, context),
    ).resolves.toBe(routedResult);

    expect(primaryDispatchMocks.route).toHaveBeenCalledWith(
      { type: 'NODE_SELECTED', payload: { nodeId: 'src/app.ts' } },
      context,
    );
    expect(primaryDispatchMocks.stateful).not.toHaveBeenCalled();
  });

  it('falls through to the stateful handlers when routed handlers do not handle the message', async () => {
    const context = createPrimaryMessageContext();
    primaryDispatchMocks.route.mockResolvedValue({ handled: false });
    primaryDispatchMocks.stateful.mockResolvedValue({
      handled: true,
      filterPatterns: ['dist/**'],
    });

    await expect(
      dispatchGraphViewPrimaryMessage(
        { type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: ['dist/**'] } },
        context,
      ),
    ).resolves.toEqual({
      handled: true,
      filterPatterns: ['dist/**'],
    });

    expect(primaryDispatchMocks.stateful).toHaveBeenCalledWith(
      { type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: ['dist/**'] } },
      context,
    );
  });
});
