import { describe, expect, it } from 'vitest';
import type { IPluginContextMenuItem } from '../../../../src/shared/plugins/contextMenu';
import type { GraphContextMenuDecision } from '../../../../src/webview/components/graph/contextMenu/decision/model';
import { classifyPluginTarget } from '../../../../src/webview/components/graph/contextMenu/targetClassification';

const pluginItems: IPluginContextMenuItem[] = [
  { label: 'Node Action', when: 'node', pluginId: 'acme', index: 0 },
  { label: 'Edge Action', when: 'edge', pluginId: 'acme', index: 1 },
  { label: 'Both Action', when: 'both', pluginId: 'acme', index: 2 },
];

describe('graph/contextMenu/targetClassification', () => {
  it('classifies a single node decision correctly', () => {
    const result = classifyPluginTarget({
      kind: 'singleFileNode',
      target: { id: 'src/app.ts', nodeKind: 'file', nodeType: 'file' },
    }, pluginItems);

    expect(result).toEqual({
      targetId: 'src/app.ts',
      targetType: 'node',
      eligibleItems: [pluginItems[0], pluginItems[2]],
    });
  });

  it('classifies an edge decision correctly', () => {
    const result = classifyPluginTarget({
      kind: 'edge',
      targets: [],
      edgeId: 'src/a.ts->src/b.ts',
    }, pluginItems);

    expect(result).toEqual({
      targetId: 'src/a.ts->src/b.ts',
      targetType: 'edge',
      eligibleItems: [pluginItems[1], pluginItems[2]],
    });
  });

  it.each<GraphContextMenuDecision>([
    { kind: 'background' },
    { kind: 'multiFileNodes', targets: [] },
    { kind: 'edge', targets: [] },
  ])('returns null for an ineligible $kind decision', decision => {
    expect(classifyPluginTarget(decision, pluginItems)).toBeNull();
  });

  it('only classifies edge ids from edge decisions', () => {
    const malformedBackgroundDecision = {
      kind: 'background',
      edgeId: 'src/a.ts->src/b.ts',
    } as unknown as GraphContextMenuDecision;

    expect(classifyPluginTarget(malformedBackgroundDecision, pluginItems)).toBeNull();
  });

  it('returns an empty item list when no plugin item matches the target type', () => {
    const result = classifyPluginTarget({
      kind: 'singleFileNode',
      target: { id: 'src/app.ts', nodeKind: 'file', nodeType: 'file' },
    }, [{ label: 'Edge Only', when: 'edge', pluginId: 'acme', index: 0 }]);

    expect(result?.eligibleItems).toEqual([]);
  });

  it('classifies every supported single-node decision as a plugin node target', () => {
    const result = classifyPluginTarget({
      kind: 'singleFolderNode',
      target: { id: 'src', nodeKind: 'folder', nodeType: 'folder' },
    }, pluginItems);

    expect(result?.targetId).toBe('src');
    expect(result?.targetType).toBe('node');
    expect(result?.eligibleItems.map(item => item.label)).toEqual(['Node Action', 'Both Action']);
  });
});
