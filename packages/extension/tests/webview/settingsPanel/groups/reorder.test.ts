import { describe, expect, it } from 'vitest';
import type { IGroup } from '../../../../src/shared/contracts';
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

  it('returns the original array when the target index is negative', () => {
    const groups: IGroup[] = [
      { id: 'a', pattern: 'a/**', color: '#111111' },
      { id: 'b', pattern: 'b/**', color: '#222222' },
    ];

    expect(reorderSettingsGroups(groups, 1, -1)).toBe(groups);
  });

  it('returns the original array when the source index is past the end', () => {
    const groups: IGroup[] = [
      { id: 'a', pattern: 'a/**', color: '#111111' },
      { id: 'b', pattern: 'b/**', color: '#222222' },
    ];

    expect(reorderSettingsGroups(groups, groups.length, 0)).toBe(groups);
  });

  it('returns the original array when the target index is past the end', () => {
    const groups: IGroup[] = [
      { id: 'a', pattern: 'a/**', color: '#111111' },
      { id: 'b', pattern: 'b/**', color: '#222222' },
    ];

    expect(reorderSettingsGroups(groups, 0, 9)).toBe(groups);
    expect(reorderSettingsGroups(groups, 0, groups.length)).toBe(groups);
  });

  it('returns the original array when the source index is negative', () => {
    const groups: IGroup[] = [
      { id: 'a', pattern: 'a/**', color: '#111111' },
      { id: 'b', pattern: 'b/**', color: '#222222' },
      { id: 'c', pattern: 'c/**', color: '#333333' },
    ];

    expect(reorderSettingsGroups(groups, -1, 1)).toBe(groups);
  });

  it('returns the original array when the source and target indices match', () => {
    const groups: IGroup[] = [
      { id: 'a', pattern: 'a/**', color: '#111111' },
      { id: 'b', pattern: 'b/**', color: '#222222' },
      { id: 'c', pattern: 'c/**', color: '#333333' },
    ];

    expect(reorderSettingsGroups(groups, 1, 1)).toBe(groups);
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
