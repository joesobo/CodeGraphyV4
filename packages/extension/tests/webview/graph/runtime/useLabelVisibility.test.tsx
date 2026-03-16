import { renderHook } from '@testing-library/react';
import type SpriteText from 'three-spritetext';
import { describe, expect, it } from 'vitest';
import { useLabelVisibility } from '../../../../src/webview/components/graph/runtime/useLabelVisibility';

describe('useLabelVisibility', () => {
  it('toggles sprite visibility to match the label setting', () => {
    const alpha = { visible: false } as unknown as SpriteText;
    const beta = { visible: false } as unknown as SpriteText;
    const spritesRef = {
      current: new Map([
        ['alpha', alpha],
        ['beta', beta],
      ]),
    };

    const { rerender } = renderHook(
      ({ showLabels }) => useLabelVisibility({ showLabels, spritesRef }),
      { initialProps: { showLabels: true } },
    );

    expect(alpha.visible).toBe(true);
    expect(beta.visible).toBe(true);

    rerender({ showLabels: false });

    expect(alpha.visible).toBe(false);
    expect(beta.visible).toBe(false);
  });
});
