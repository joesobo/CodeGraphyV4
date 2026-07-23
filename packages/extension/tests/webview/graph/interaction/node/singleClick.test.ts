import { describe, expect, it } from 'vitest';
import { getNodeSingleClickCommand } from '../../../../../src/webview/components/graph/interaction/node/singleClick/command';

function makeNodeSingleClickOptions(
  overrides: Partial<Parameters<typeof getNodeSingleClickCommand>[0]> = {},
) {
  return {
    nodeId: 'src/app.ts',
    label: 'app.ts',
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    clientX: 12,
    clientY: 24,
    selectedNodeIds: [],
    now: 200,
    ...overrides,
  };
}

describe('graph/interaction node single click', () => {
  it('selects and previews a normal click', () => {
    const result = getNodeSingleClickCommand(makeNodeSingleClickOptions());

    expect(result).toEqual({
      nextLastClick: { nodeId: 'src/app.ts', time: 200 },
      effects: [
        { kind: 'selectOnlyNode', nodeId: 'src/app.ts' },
        { kind: 'previewNode', nodeId: 'src/app.ts' },
      ],
    });
  });

  it('clears selection and focused file when re-clicking the only selected node', () => {
    const result = getNodeSingleClickCommand(
      makeNodeSingleClickOptions({
        selectedNodeIds: ['src/app.ts'],
      }),
    );

    expect(result).toEqual({
      nextLastClick: null,
      effects: [
        { kind: 'clearSelection' },
        { kind: 'clearFocusedFile' },
      ],
    });
  });

  it('adds a node to the current selection on modifier click', () => {
    const result = getNodeSingleClickCommand(
      makeNodeSingleClickOptions({
        nodeId: 'src/utils.ts',
        label: 'utils.ts',
        ctrlKey: true,
        clientX: 8,
        clientY: 16,
        selectedNodeIds: ['src/app.ts'],
      }),
    );

    expect(result).toEqual({
      nextLastClick: { nodeId: 'src/utils.ts', time: 200 },
      effects: [
        { kind: 'setSelection', nodeIds: ['src/app.ts', 'src/utils.ts'] },
      ],
    });
  });

  it('removes a node from the current selection on repeated modifier click', () => {
    const result = getNodeSingleClickCommand(
      makeNodeSingleClickOptions({
        nodeId: 'src/utils.ts',
        label: 'utils.ts',
        shiftKey: true,
        clientX: 8,
        clientY: 16,
        selectedNodeIds: ['src/utils.ts'],
      }),
    );

    expect(result).toEqual({
      nextLastClick: { nodeId: 'src/utils.ts', time: 200 },
      effects: [
        { kind: 'setSelection', nodeIds: [] },
        { kind: 'clearFocusedFile' },
      ],
    });
  });

});
