import { describe, expect, it } from 'vitest';
import { buildNodeSingleClickSelectionResult } from '../../../../../src/webview/components/graph/interaction/node/singleClickSelection';

function makeOptions(overrides: Partial<Parameters<typeof buildNodeSingleClickSelectionResult>[0]> = {}) {
  return {
    clientX: 10,
    clientY: 20,
    ctrlKey: false,
    label: 'Node',
    metaKey: false,
    nodeId: 'node-a',
    now: 123,
    selectedNodeIds: [],
    shiftKey: false,
    ...overrides,
  };
}

describe('graph/interaction/nodeSingleClickSelection', () => {
  it('selects and previews the node when no modifiers are pressed', () => {
    expect(buildNodeSingleClickSelectionResult(makeOptions())).toEqual({
      nextLastClick: {
        nodeId: 'node-a',
        time: 123,
      },
      effects: [
        { kind: 'selectOnlyNode', nodeId: 'node-a' },
        { kind: 'previewNode', nodeId: 'node-a' },
      ],
    });
  });

  it('toggles multi-selection when a modifier is pressed', () => {
    expect(
      buildNodeSingleClickSelectionResult(
        makeOptions({
          ctrlKey: true,
          selectedNodeIds: ['node-b'],
        }),
      ),
    ).toEqual({
      nextLastClick: {
        nodeId: 'node-a',
        time: 123,
      },
      effects: [
        { kind: 'setSelection', nodeIds: ['node-b', 'node-a'] },
      ],
    });
  });

  it('clears selection and focused file when clicking the only selected node', () => {
    expect(
      buildNodeSingleClickSelectionResult(
        makeOptions({
          selectedNodeIds: ['node-a'],
        }),
      ),
    ).toEqual({
      nextLastClick: null,
      effects: [
        { kind: 'clearSelection' },
        { kind: 'clearFocusedFile' },
      ],
    });
  });
});
