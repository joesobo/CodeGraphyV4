import { beforeEach, describe, expect, it, vi } from 'vitest';
import { postLegendOrderUpdate } from '../../../../src/webview/components/legends/panel/section/order';
import * as displayRulesModule from '../../../../src/webview/components/legends/panel/section/displayRules';
import * as messagesModule from '../../../../src/webview/components/legends/panel/messages';
import * as vscodeApiModule from '../../../../src/webview/vscodeApi';

describe('legends/sectionOrder', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('places reordered node legends before edge legends', () => {
    vi.spyOn(messagesModule, 'reorderItems').mockReturnValue([
      { id: 'node-b' },
      { id: 'node-a' },
    ] as never);
    const resolveDisplayRulesSpy = vi
      .spyOn(displayRulesModule, 'resolveDisplayRules')
      .mockReturnValue([{ id: 'edge-a' }] as never);
    const postMessageSpy = vi.spyOn(vscodeApiModule, 'postMessage').mockImplementation(() => {});

    postLegendOrderUpdate([] as never, [] as never, 'node', 2, 0);

    expect(resolveDisplayRulesSpy).toHaveBeenCalledWith([], 'edge');
    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'UPDATE_LEGEND_ORDER',
      payload: { legendIds: ['node-b', 'node-a', 'edge-a'] },
    });
  });

  it('places reordered edge legends after node legends', () => {
    vi.spyOn(messagesModule, 'reorderItems').mockReturnValue([
      { id: 'edge-b' },
      { id: 'edge-a' },
    ] as never);
    const resolveDisplayRulesSpy = vi
      .spyOn(displayRulesModule, 'resolveDisplayRules')
      .mockReturnValue([{ id: 'node-a' }] as never);
    const postMessageSpy = vi.spyOn(vscodeApiModule, 'postMessage').mockImplementation(() => {});

    postLegendOrderUpdate([] as never, [] as never, 'edge', 0, 1);

    expect(resolveDisplayRulesSpy).toHaveBeenCalledWith([], 'node');
    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'UPDATE_LEGEND_ORDER',
      payload: { legendIds: ['node-a', 'edge-b', 'edge-a'] },
    });
  });
});
