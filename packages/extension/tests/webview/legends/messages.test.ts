import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  createLegendRuleId,
  reorderItems,
  sendUserLegendRules,
} from '../../../src/webview/components/legends/messages';
import { postMessage } from '../../../src/webview/vscodeApi';
import type { IGroup } from '../../../src/shared/settings/groups';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

describe('webview/legends/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a stable legend rule id from the current time and random suffix', () => {
    expect(createLegendRuleId()).toBe('legend:1234567890:4fzzzx');
  });

  it('reorders items by moving the source item to the target index', () => {
    expect(reorderItems(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('returns a shallow clone when the source index is negative', () => {
    const items = ['a', 'b', 'c'];
    const reordered = reorderItems(items, -1, 0);

    expect(reordered).toEqual(items);
    expect(reordered).not.toBe(items);
  });

  it('returns a shallow clone when the target index is negative', () => {
    const items = ['a', 'b', 'c'];
    const reordered = reorderItems(items, 2, -1);

    expect(reordered).toEqual(items);
    expect(reordered).not.toBe(items);
  });

  it('returns a shallow clone when the source index is out of range', () => {
    const items = ['a', 'b', 'c'];
    const reordered = reorderItems(items, 3, 1);

    expect(reordered).toEqual(items);
    expect(reordered).not.toBe(items);
  });

  it('returns a shallow clone when the target index is out of range', () => {
    const items = ['a', 'b', 'c'];
    const reordered = reorderItems(items, 1, 3);

    expect(reordered).toEqual(items);
    expect(reordered).not.toBe(items);
  });

  it('returns a shallow clone when the source and target indices match', () => {
    const items = ['a', 'b', 'c'];
    const reordered = reorderItems(items, 1, 1);

    expect(reordered).toEqual(items);
    expect(reordered).not.toBe(items);
  });

  it('updates optimistic legends and posts the full legend payload', () => {
    const rules: IGroup[] = [{ id: 'legend:1', pattern: '*.ts', color: '#22C55E' }];
    const setOptimisticUserLegends = vi.fn();

    sendUserLegendRules(rules, setOptimisticUserLegends);

    expect(setOptimisticUserLegends).toHaveBeenCalledWith(rules);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'UPDATE_LEGENDS',
      payload: { legends: rules },
    });
  });
});
