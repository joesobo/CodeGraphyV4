import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useColorUpdates } from '../../../../../src/webview/components/settingsPanel/display/use/colorUpdates';

const sentMessages: unknown[] = [];
vi.mock('../../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

describe('display useColorUpdates', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    vi.useRealTimers();
  });

  it('normalizes direction colors before persisting them', () => {
    vi.useFakeTimers();
    const setDirectionColor = vi.fn();
    const { result } = renderHook(() =>
      useColorUpdates({
        setDirectionColor,
      }),
    );

    act(() => {
      result.current.onDirectionColorChange('#abcdef');
      vi.advanceTimersByTime(150);
    });

    expect(setDirectionColor).toHaveBeenCalledWith('#ABCDEF');
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_DIRECTION_COLOR',
      payload: { directionColor: '#ABCDEF' },
    });
  });

  it('cancels pending color posts on unmount', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() =>
      useColorUpdates({
        setDirectionColor: vi.fn(),
      }),
    );

    act(() => {
      result.current.onDirectionColorChange('#abcdef');
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(sentMessages).toEqual([]);
  });
});
