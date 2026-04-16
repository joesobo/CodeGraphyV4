import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRulePromptHandlers } from '../../../src/webview/app/rulePromptHandlers';

const sentMessages: Array<{ type: string; payload?: unknown }> = [];

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: (message: { type: string; payload?: unknown }) => sentMessages.push(message),
}));

describe('app/rulePromptHandlers', () => {
  it('opens and closes filter prompts and posts trimmed filter pattern updates', () => {
    const setFilterPatterns = vi.fn();
    const setOptimisticUserLegends = vi.fn();
    const setRulePrompt = vi.fn();
    sentMessages.length = 0;

    const { result } = renderHook(() =>
      useRulePromptHandlers({
        filterPatterns: ['src/**'],
        userLegendRules: [],
        setFilterPatterns,
        setOptimisticUserLegends,
        setRulePrompt,
      }),
    );

    act(() => {
      result.current.openFilterPrompt(' src/lib/** ');
      result.current.handleRulePromptSubmit({ kind: 'filter', pattern: ' src/lib/** ' });
      result.current.closeRulePrompt();
    });

    expect(setRulePrompt).toHaveBeenCalledWith({ kind: 'filter', pattern: ' src/lib/** ' });
    expect(setFilterPatterns).toHaveBeenCalledWith(['src/**', 'src/lib/**']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['src/**', 'src/lib/**'] },
    });
    expect(setOptimisticUserLegends).not.toHaveBeenCalled();
    expect(setRulePrompt).toHaveBeenLastCalledWith(null);
  });

  it('opens legend prompts and posts generated legend updates', () => {
    const setFilterPatterns = vi.fn();
    const setOptimisticUserLegends = vi.fn();
    const setRulePrompt = vi.fn();
    sentMessages.length = 0;
    vi.spyOn(Date, 'now').mockReturnValue(123456);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456);

    const { result } = renderHook(() =>
      useRulePromptHandlers({
        filterPatterns: [],
        userLegendRules: [{ id: 'existing', pattern: 'src/**', color: '#123456', target: 'node' }],
        setFilterPatterns,
        setOptimisticUserLegends,
        setRulePrompt,
      }),
    );

    act(() => {
      result.current.openLegendPrompt({ pattern: ' notes/** ', color: '#abcdef', target: 'edge' });
      result.current.handleRulePromptSubmit({
        kind: 'legend',
        pattern: ' notes/** ',
        color: '#abcdef',
        target: 'edge',
      });
    });

    expect(setRulePrompt).toHaveBeenCalledWith({
      kind: 'legend',
      pattern: ' notes/** ',
      color: '#abcdef',
      target: 'edge',
    });
    expect(setOptimisticUserLegends).toHaveBeenCalledWith([
      { id: 'existing', pattern: 'src/**', color: '#123456', target: 'node' },
      { id: 'legend:123456:4fzyo8', pattern: 'notes/**', color: '#abcdef', target: 'edge' },
    ]);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_LEGENDS',
      payload: {
        legends: [
          { id: 'existing', pattern: 'src/**', color: '#123456', target: 'node' },
          { id: 'legend:123456:4fzyo8', pattern: 'notes/**', color: '#abcdef', target: 'edge' },
        ],
      },
    });
    expect(setFilterPatterns).not.toHaveBeenCalled();
  });

  it('uses the latest prompt setter callbacks after rerendering', () => {
    const initialSetRulePrompt = vi.fn();
    const nextSetRulePrompt = vi.fn();

    const { result, rerender } = renderHook(
      (setRulePrompt) =>
        useRulePromptHandlers({
          filterPatterns: [],
          userLegendRules: [],
          setFilterPatterns: vi.fn(),
          setOptimisticUserLegends: vi.fn(),
          setRulePrompt,
        }),
      {
        initialProps: initialSetRulePrompt,
      },
    );

    rerender(nextSetRulePrompt);

    act(() => {
      result.current.openFilterPrompt('src/**');
      result.current.openLegendPrompt({ pattern: 'notes/**', color: '#abcdef', target: 'edge' });
      result.current.closeRulePrompt();
    });

    expect(initialSetRulePrompt).not.toHaveBeenCalled();
    expect(nextSetRulePrompt).toHaveBeenNthCalledWith(1, {
      kind: 'filter',
      pattern: 'src/**',
    });
    expect(nextSetRulePrompt).toHaveBeenNthCalledWith(2, {
      kind: 'legend',
      pattern: 'notes/**',
      color: '#abcdef',
      target: 'edge',
    });
    expect(nextSetRulePrompt).toHaveBeenNthCalledWith(3, null);
  });

  it('uses the latest filters and legend rules and closes even when no legend update is produced', () => {
    const firstSetFilterPatterns = vi.fn();
    const nextSetFilterPatterns = vi.fn();
    const firstSetOptimisticUserLegends = vi.fn();
    const nextSetOptimisticUserLegends = vi.fn();
    const setRulePrompt = vi.fn();
    sentMessages.length = 0;

    const { result, rerender } = renderHook(
      ({
        filterPatterns,
        userLegendRules,
        setFilterPatterns,
        setOptimisticUserLegends,
      }) =>
        useRulePromptHandlers({
          filterPatterns,
          userLegendRules,
          setFilterPatterns,
          setOptimisticUserLegends,
          setRulePrompt,
        }),
      {
        initialProps: {
          filterPatterns: ['src/**'],
          userLegendRules: [{ id: 'existing', pattern: 'src/**', color: '#123456', target: 'node' as const }],
          setFilterPatterns: firstSetFilterPatterns,
          setOptimisticUserLegends: firstSetOptimisticUserLegends,
        },
      },
    );

    rerender({
      filterPatterns: ['src/**', 'tests/**'],
      userLegendRules: [{ id: 'existing', pattern: 'src/**', color: '#123456', target: 'node' as const }],
      setFilterPatterns: nextSetFilterPatterns,
      setOptimisticUserLegends: nextSetOptimisticUserLegends,
    });

    act(() => {
      result.current.handleRulePromptSubmit({ kind: 'filter', pattern: 'tests/**' });
      result.current.handleRulePromptSubmit({
        kind: 'legend',
        pattern: '   ',
        color: '#abcdef',
        target: 'edge',
      });
    });

    expect(firstSetFilterPatterns).not.toHaveBeenCalled();
    expect(nextSetFilterPatterns).not.toHaveBeenCalled();
    expect(firstSetOptimisticUserLegends).not.toHaveBeenCalled();
    expect(nextSetOptimisticUserLegends).not.toHaveBeenCalled();
    expect(sentMessages).toEqual([]);
    expect(setRulePrompt).toHaveBeenCalledTimes(2);
    expect(setRulePrompt).toHaveBeenNthCalledWith(1, null);
    expect(setRulePrompt).toHaveBeenNthCalledWith(2, null);
  });
});
