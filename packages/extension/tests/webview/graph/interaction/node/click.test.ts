import { describe, expect, it } from 'vitest';
import { getNodeClickCommand } from '../../../../../src/webview/components/graph/interaction/node/click';

function makeNodeClickOptions(overrides: Partial<Parameters<typeof getNodeClickCommand>[0]> = {}) {
  return {
    nodeId: 'src/app.ts',
    label: 'app.ts',
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    clientX: 12,
    clientY: 24,
    isMacPlatform: false,
    selectedNodeIds: [],
    lastClick: null,
    now: 200,
    doubleClickThresholdMs: 450,
    ...overrides,
  };
}

describe('graph/interaction node click', () => {
  it('opens the node context menu for mac control-click', () => {
    const result = getNodeClickCommand(
      makeNodeClickOptions({
        ctrlKey: true,
        isMacPlatform: true,
      }),
    );

    expect(result).toEqual({
      nextLastClick: null,
      effects: [{ kind: 'openNodeContextMenu', nodeId: 'src/app.ts' }],
    });
  });

  it('opens and focuses the node on double-click within the threshold', () => {
    const result = getNodeClickCommand(
      makeNodeClickOptions({
        selectedNodeIds: ['src/utils.ts'],
        lastClick: { nodeId: 'src/app.ts', time: 100 },
      }),
    );

    expect(result).toEqual({
      nextLastClick: null,
      effects: [
        { kind: 'selectOnlyNode', nodeId: 'src/app.ts' },
        { kind: 'openNode', nodeId: 'src/app.ts' },
        { kind: 'focusNode', nodeId: 'src/app.ts' },
        {
          kind: 'sendInteraction',
          event: 'graph:nodeDoubleClick',
          payload: {
            node: { id: 'src/app.ts', label: 'app.ts' },
            event: { x: 12, y: 24 },
          },
        },
      ],
    });
  });

  it('starts a new click sequence when the double-click threshold has expired', () => {
    const result = getNodeClickCommand(
      makeNodeClickOptions({
        lastClick: { nodeId: 'src/app.ts', time: 100 },
        now: 700,
      }),
    );

    expect(result).toEqual({
      nextLastClick: { nodeId: 'src/app.ts', time: 700 },
      effects: [
        { kind: 'selectOnlyNode', nodeId: 'src/app.ts' },
        { kind: 'previewNode', nodeId: 'src/app.ts' },
        {
          kind: 'sendInteraction',
          event: 'graph:nodeClick',
          payload: {
            node: { id: 'src/app.ts', label: 'app.ts' },
            event: { x: 12, y: 24 },
          },
        },
      ],
    });
  });

  it('starts a new click sequence when the click lands exactly on the double-click threshold', () => {
    const result = getNodeClickCommand(
      makeNodeClickOptions({
        lastClick: { nodeId: 'src/app.ts', time: 100 },
        now: 550,
      }),
    );

    expect(result).toEqual({
      nextLastClick: { nodeId: 'src/app.ts', time: 550 },
      effects: [
        { kind: 'selectOnlyNode', nodeId: 'src/app.ts' },
        { kind: 'previewNode', nodeId: 'src/app.ts' },
        {
          kind: 'sendInteraction',
          event: 'graph:nodeClick',
          payload: {
            node: { id: 'src/app.ts', label: 'app.ts' },
            event: { x: 12, y: 24 },
          },
        },
      ],
    });
  });

  it('adds a node to the multi-selection on modifier click', () => {
    const result = getNodeClickCommand(
      makeNodeClickOptions({
        nodeId: 'src/utils.ts',
        label: 'utils.ts',
        ctrlKey: true,
        clientX: 8,
        clientY: 16,
        isMacPlatform: false,
        selectedNodeIds: ['src/app.ts'],
      }),
    );

    expect(result).toEqual({
      nextLastClick: { nodeId: 'src/utils.ts', time: 200 },
      effects: [
        { kind: 'setSelection', nodeIds: ['src/app.ts', 'src/utils.ts'] },
        {
          kind: 'sendInteraction',
          event: 'graph:nodeClick',
          payload: {
            node: { id: 'src/utils.ts', label: 'utils.ts' },
            event: { x: 8, y: 16 },
          },
        },
      ],
    });
  });

  it('removes a node from the multi-selection when it is clicked again with a modifier', () => {
    const result = getNodeClickCommand(
      makeNodeClickOptions({
        nodeId: 'src/utils.ts',
        label: 'utils.ts',
        shiftKey: true,
        clientX: 8,
        clientY: 16,
        isMacPlatform: false,
        selectedNodeIds: ['src/app.ts', 'src/utils.ts'],
      }),
    );

    expect(result).toEqual({
      nextLastClick: { nodeId: 'src/utils.ts', time: 200 },
      effects: [
        { kind: 'setSelection', nodeIds: ['src/app.ts'] },
        {
          kind: 'sendInteraction',
          event: 'graph:nodeClick',
          payload: {
            node: { id: 'src/utils.ts', label: 'utils.ts' },
            event: { x: 8, y: 16 },
          },
        },
      ],
    });
  });
});
