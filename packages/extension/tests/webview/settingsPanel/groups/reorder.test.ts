import { describe, expect, it } from 'vitest';
import type { IGroup } from '../../../../src/shared/types';
import { reorderSettingsGroups } from '../../../../src/webview/components/settingsPanel/groups/reorder';

describe('settingsPanel groups reorder', () => {
  it('reorders settings groups by moving the dragged group to the target index', () => {
    const groups: IGroup[] = [
      { id: 'a', pattern: 'a/**', color: '#111111' },
      { id: 'b', pattern: 'b/**', color: '#222222' },
      { id: 'c', pattern: 'c/**', color: '#333333' },
    ];

    expect(reorderSettingsGroups(groups, 0, 2).map((group) => group.id)).toEqual(['b', 'c', 'a']);
  });

  it('leaves settings groups unchanged when the drag indices do not produce a move', () => {
    const groups: IGroup[] = [
      { id: 'a', pattern: 'a/**', color: '#111111' },
      { id: 'b', pattern: 'b/**', color: '#222222' },
    ];

    expect(reorderSettingsGroups(groups, 1, 1)).toEqual(groups);
    expect(reorderSettingsGroups(groups, -1, 1)).toEqual(groups);
    expect(reorderSettingsGroups(groups, 1, -1)).toEqual(groups);
    expect(reorderSettingsGroups(groups, groups.length, 0)).toEqual(groups);
    expect(reorderSettingsGroups(groups, 0, 9)).toEqual(groups);
    expect(reorderSettingsGroups(groups, 0, groups.length)).toEqual(groups);
  });

  it('allows moving a group to index zero', () => {
    const groups: IGroup[] = [
      { id: 'a', pattern: 'a/**', color: '#111111' },
      { id: 'b', pattern: 'b/**', color: '#222222' },
      { id: 'c', pattern: 'c/**', color: '#333333' },
    ];

    expect(reorderSettingsGroups(groups, 2, 0).map((group) => group.id)).toEqual(['c', 'a', 'b']);
  });
});
