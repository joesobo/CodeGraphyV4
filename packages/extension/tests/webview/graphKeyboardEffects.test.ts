import { describe, expect, it } from 'vitest';
import { getGraphKeyboardCommand } from '../../src/webview/components/graphKeyboardEffects';

describe('graphKeyboardEffects', () => {
  it('ignores shortcuts when focus is inside an editable input', () => {
    expect(getGraphKeyboardCommand({
      key: '0',
      isMod: false,
      shiftKey: false,
      graphMode: '2d',
      selectedNodeIds: [],
      allNodeIds: [],
      targetIsEditable: true,
    })).toBeNull();
  });

  it('fits the view for the 0 shortcut', () => {
    expect(getGraphKeyboardCommand({
      key: '0',
      isMod: false,
      shiftKey: false,
      graphMode: '3d',
      selectedNodeIds: [],
      allNodeIds: [],
      targetIsEditable: false,
    })).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'fitView' }],
    });
  });

  it('clears the selection for Escape', () => {
    expect(getGraphKeyboardCommand({
      key: 'Escape',
      isMod: false,
      shiftKey: false,
      graphMode: '2d',
      selectedNodeIds: ['src/app.ts'],
      allNodeIds: ['src/app.ts'],
      targetIsEditable: false,
    })).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'clearSelection' }],
    });
  });

  it('opens all selected nodes for Enter', () => {
    expect(getGraphKeyboardCommand({
      key: 'Enter',
      isMod: false,
      shiftKey: false,
      graphMode: '2d',
      selectedNodeIds: ['src/app.ts', 'src/utils.ts'],
      allNodeIds: ['src/app.ts', 'src/utils.ts'],
      targetIsEditable: false,
    })).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'openSelectedNodes', nodeIds: ['src/app.ts', 'src/utils.ts'] }],
    });
  });

  it('selects all nodes for the modifier+a shortcut', () => {
    expect(getGraphKeyboardCommand({
      key: 'a',
      isMod: true,
      shiftKey: false,
      graphMode: '2d',
      selectedNodeIds: [],
      allNodeIds: ['src/app.ts', 'src/utils.ts'],
      targetIsEditable: false,
    })).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'selectAll', nodeIds: ['src/app.ts', 'src/utils.ts'] }],
    });
  });

  it('zooms only in 2d mode for plus and minus shortcuts', () => {
    expect(getGraphKeyboardCommand({
      key: '+',
      isMod: false,
      shiftKey: false,
      graphMode: '2d',
      selectedNodeIds: [],
      allNodeIds: [],
      targetIsEditable: false,
    })).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'zoom', factor: 1.2 }],
    });

    expect(getGraphKeyboardCommand({
      key: '-',
      isMod: false,
      shiftKey: false,
      graphMode: '2d',
      selectedNodeIds: [],
      allNodeIds: [],
      targetIsEditable: false,
    })).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'zoom', factor: 1 / 1.2 }],
    });

    expect(getGraphKeyboardCommand({
      key: '+',
      isMod: false,
      shiftKey: false,
      graphMode: '3d',
      selectedNodeIds: [],
      allNodeIds: [],
      targetIsEditable: false,
    })).toBeNull();
  });

  it('maps modifier+z and modifier+y to undo and redo messages', () => {
    expect(getGraphKeyboardCommand({
      key: 'z',
      isMod: true,
      shiftKey: false,
      graphMode: '2d',
      selectedNodeIds: [],
      allNodeIds: [],
      targetIsEditable: false,
    })).toEqual({
      preventDefault: true,
      stopPropagation: true,
      effects: [{ kind: 'postMessage', message: { type: 'UNDO' } }],
    });

    expect(getGraphKeyboardCommand({
      key: 'Z',
      isMod: true,
      shiftKey: true,
      graphMode: '2d',
      selectedNodeIds: [],
      allNodeIds: [],
      targetIsEditable: false,
    })).toEqual({
      preventDefault: true,
      stopPropagation: true,
      effects: [{ kind: 'postMessage', message: { type: 'REDO' } }],
    });

    expect(getGraphKeyboardCommand({
      key: 'y',
      isMod: true,
      shiftKey: false,
      graphMode: '2d',
      selectedNodeIds: [],
      allNodeIds: [],
      targetIsEditable: false,
    })).toEqual({
      preventDefault: true,
      stopPropagation: true,
      effects: [{ kind: 'postMessage', message: { type: 'REDO' } }],
    });
  });

  it('maps toolbar fallback shortcuts to store messages', () => {
    expect(getGraphKeyboardCommand({
      key: 'v',
      isMod: false,
      shiftKey: false,
      graphMode: '2d',
      selectedNodeIds: [],
      allNodeIds: [],
      targetIsEditable: false,
    })).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'dispatchStoreMessage', message: { type: 'CYCLE_VIEW' } }],
    });

    expect(getGraphKeyboardCommand({
      key: 'L',
      isMod: false,
      shiftKey: false,
      graphMode: '2d',
      selectedNodeIds: [],
      allNodeIds: [],
      targetIsEditable: false,
    })).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'dispatchStoreMessage', message: { type: 'CYCLE_LAYOUT' } }],
    });

    expect(getGraphKeyboardCommand({
      key: 'T',
      isMod: false,
      shiftKey: false,
      graphMode: '2d',
      selectedNodeIds: [],
      allNodeIds: [],
      targetIsEditable: false,
    })).toEqual({
      preventDefault: true,
      stopPropagation: false,
      effects: [{ kind: 'dispatchStoreMessage', message: { type: 'TOGGLE_DIMENSION' } }],
    });
  });
});
