import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLazyRef } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/lazyRef';

describe('owned2d/useLazyRef', () => {
  it('creates one owned value and retains it across rerenders', () => {
    const firstFactory = vi.fn(() => ({ id: 'first' }));
    const secondFactory = vi.fn(() => ({ id: 'second' }));
    const { result, rerender } = renderHook(
      ({ factory }) => useLazyRef(factory),
      { initialProps: { factory: firstFactory } },
    );
    const firstValue = result.current.current;

    rerender({ factory: secondFactory });

    expect(result.current.current).toBe(firstValue);
    expect(firstFactory).toHaveBeenCalledOnce();
    expect(secondFactory).not.toHaveBeenCalled();
  });
});
