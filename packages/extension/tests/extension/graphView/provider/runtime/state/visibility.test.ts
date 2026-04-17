import { describe, expect, it } from 'vitest';
import { isGraphViewVisible } from '../../../../../../src/extension/graphView/provider/runtime/state/visibility';

describe('graphView/provider/runtime/state/visibility', () => {
  it('detects visibility from the main view or detached panels', () => {
    expect(isGraphViewVisible({ visible: true } as never, [])).toBe(true);
    expect(isGraphViewVisible(undefined, [{ visible: true }] as never)).toBe(true);
    expect(isGraphViewVisible(undefined, [{ visible: false }] as never)).toBe(false);
  });
});
