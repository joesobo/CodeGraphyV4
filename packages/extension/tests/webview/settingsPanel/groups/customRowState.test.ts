import { describe, expect, it } from 'vitest';
import {
  getCustomRowClassName,
  isCustomRowDraggable,
} from '../../../../src/webview/components/settingsPanel/groups/customRowState';

describe('customRowState', () => {
  it('builds row classes for drag, expanded, and disabled states', () => {
    expect(
      getCustomRowClassName({
        dragIndex: 0,
        dragOverIndex: 1,
        groupDisabled: true,
        index: 1,
        isExpanded: true,
      }),
    ).toContain('bg-accent');

    expect(
      getCustomRowClassName({
        dragIndex: 0,
        dragOverIndex: 1,
        groupDisabled: true,
        index: 1,
        isExpanded: true,
      }),
    ).toContain('opacity-50');
  });

  it('marks only collapsed rows as draggable', () => {
    expect(isCustomRowDraggable(false)).toBe(true);
    expect(isCustomRowDraggable(true)).toBe(false);
  });
});
