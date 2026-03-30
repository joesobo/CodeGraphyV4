import { describe, expect, it } from 'vitest';
import {
  getCustomRowClassName,
  isCustomRowDraggable,
} from '../../../../../src/webview/components/settingsPanel/groups/shared/rowState';

describe('customRowState', () => {
  it('includes the base row classes', () => {
    expect(
      getCustomRowClassName({
        dragIndex: null,
        dragOverIndex: null,
        groupDisabled: false,
        index: 1,
        isExpanded: false,
      }),
    ).toContain('rounded transition-colors');
  });

  it('adds the hover highlight when a different row is the current drop target', () => {
    expect(
      getCustomRowClassName({
        dragIndex: 0,
        dragOverIndex: 1,
        groupDisabled: true,
        index: 1,
        isExpanded: true,
      }),
    ).toContain('bg-accent');
  });

  it('omits the hover highlight when dragging over the same row', () => {
    expect(
      getCustomRowClassName({
        dragIndex: 1,
        dragOverIndex: 1,
        groupDisabled: false,
        index: 1,
        isExpanded: false,
      }),
    ).not.toContain('outline-primary/50');
  });

  it('omits the hover highlight when the row is not the current drop target', () => {
    expect(
      getCustomRowClassName({
        dragIndex: 0,
        dragOverIndex: 2,
        groupDisabled: false,
        index: 1,
        isExpanded: false,
      }),
    ).not.toContain('outline-primary/50');
  });

  it('adds the dragged-row opacity class', () => {
    expect(
      getCustomRowClassName({
        dragIndex: 1,
        dragOverIndex: null,
        groupDisabled: false,
        index: 1,
        isExpanded: false,
      }),
    ).toContain('opacity-40');
  });

  it('omits the dragged-row opacity class when another row is being dragged', () => {
    expect(
      getCustomRowClassName({
        dragIndex: 0,
        dragOverIndex: null,
        groupDisabled: false,
        index: 1,
        isExpanded: false,
      }),
    ).not.toContain('opacity-40');
  });

  it('adds expanded row styling', () => {
    expect(
      getCustomRowClassName({
        dragIndex: null,
        dragOverIndex: null,
        groupDisabled: false,
        index: 1,
        isExpanded: true,
      }),
    ).toContain('bg-accent/50 p-1.5');
  });

  it('adds the disabled-row opacity class', () => {
    expect(
      getCustomRowClassName({
        dragIndex: null,
        dragOverIndex: null,
        groupDisabled: true,
        index: 1,
        isExpanded: false,
      }),
    ).toContain('opacity-50');
  });

  it('marks only collapsed rows as draggable', () => {
    expect(isCustomRowDraggable(false)).toBe(true);
    expect(isCustomRowDraggable(true)).toBe(false);
  });
});
