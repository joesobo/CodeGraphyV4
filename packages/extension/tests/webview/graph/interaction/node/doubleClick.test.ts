import { describe, expect, it } from 'vitest';
import {
  getNodeDoubleClickCommand,
  isDoubleNodeClick,
} from '../../../../../src/webview/components/graph/interaction/node/doubleClick';

function makeNodeDoubleClickOptions(
  overrides: Partial<Parameters<typeof getNodeDoubleClickCommand>[0]> = {},
) {
  return {
    nodeId: 'src/app.ts',
    label: 'app.ts',
    clientX: 12,
    clientY: 24,
    lastClick: { nodeId: 'src/app.ts', time: 100 },
    now: 200,
    doubleClickThresholdMs: 450,
    ...overrides,
  };
}

describe('graph/interaction node double click', () => {
  it('detects a double click for the same node within the threshold', () => {
    expect(isDoubleNodeClick(makeNodeDoubleClickOptions())).toBe(true);
  });

  it('does not detect a double click when the threshold has expired', () => {
    expect(
      isDoubleNodeClick(
        makeNodeDoubleClickOptions({
          now: 550,
        }),
      ),
    ).toBe(false);
  });

  it('does not detect a double click for a different node', () => {
    expect(
      isDoubleNodeClick(
        makeNodeDoubleClickOptions({
          nodeId: 'src/utils.ts',
        }),
      ),
    ).toBe(false);
  });

  it('builds the double-click interaction effects', () => {
    const result = getNodeDoubleClickCommand(makeNodeDoubleClickOptions());

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

  it('does not expand collapsed Graph Sections on double click', () => {
    const result = getNodeDoubleClickCommand(makeNodeDoubleClickOptions({
      isCollapsedGraphSection: true,
      isGraphSection: true,
      nodeId: 'section-1',
      label: 'Section 1',
    }));

    expect(result).toEqual({
      nextLastClick: null,
      effects: [
        { kind: 'selectOnlyNode', nodeId: 'section-1' },
        {
          kind: 'sendInteraction',
          event: 'graph:nodeDoubleClick',
          payload: {
            node: { id: 'section-1', label: 'Section 1' },
            event: { x: 12, y: 24 },
          },
        },
      ],
    });
    expect(result.effects).not.toContainEqual({
      kind: 'setGraphSectionCollapsed',
      sectionId: 'section-1',
      collapsed: false,
    });
  });

  it('does not collapse expanded Graph Sections on double click', () => {
    const result = getNodeDoubleClickCommand(makeNodeDoubleClickOptions({
      isCollapsedGraphSection: false,
      isGraphSection: true,
      nodeId: 'section-1',
      label: 'Section 1',
    }));

    expect(result.effects).not.toContainEqual({
      kind: 'setGraphSectionCollapsed',
      sectionId: 'section-1',
      collapsed: true,
    });
    expect(result.effects).not.toContainEqual({ kind: 'openNode', nodeId: 'section-1' });
  });
});
