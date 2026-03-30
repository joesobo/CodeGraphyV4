import { describe, expect, it } from 'vitest';
import {
  getNodeContextMenuSelection,
  toggleNodeSelection,
} from '../../../../src/webview/components/graph/interaction/nodeSelection';

describe('graph/interaction node selection', () => {
  it('adds a node when toggling a node that is not selected', () => {
    expect(toggleNodeSelection('src/app.ts', ['src/utils.ts'])).toEqual([
      'src/utils.ts',
      'src/app.ts',
    ]);
  });

  it('removes a node when toggling a node that is already selected', () => {
    expect(toggleNodeSelection('src/app.ts', ['src/app.ts', 'src/utils.ts'])).toEqual([
      'src/utils.ts',
    ]);
  });

  it('keeps the current selection when right-clicking an already selected node', () => {
    expect(getNodeContextMenuSelection('src/app.ts', ['src/app.ts', 'src/utils.ts'])).toEqual({
      nodeIds: ['src/app.ts', 'src/utils.ts'],
      shouldUpdateSelection: false,
    });
  });

  it('selects only the target node when right-clicking an unselected node', () => {
    expect(getNodeContextMenuSelection('src/app.ts', ['src/utils.ts'])).toEqual({
      nodeIds: ['src/app.ts'],
      shouldUpdateSelection: true,
    });
  });
});
