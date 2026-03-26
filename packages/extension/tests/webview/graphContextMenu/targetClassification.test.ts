import { describe, it, expect } from 'vitest';
import { classifyTarget } from '../../../src/webview/components/graphContextMenu/targetClassification';
import type { IPluginContextMenuItem } from '../../../src/shared/contracts';

const pluginItems: IPluginContextMenuItem[] = [
  { label: 'Node Action', when: 'node', pluginId: 'acme', index: 0 },
  { label: 'Edge Action', when: 'edge', pluginId: 'acme', index: 1 },
  { label: 'Both Action', when: 'both', pluginId: 'acme', index: 2 },
];

describe('graphContextMenu/targetClassification', () => {
  it('classifies a single node selection correctly', () => {
    const result = classifyTarget(
      { kind: 'node', targets: ['src/app.ts'] },
      pluginItems
    );

    expect(result).not.toBeNull();
    expect(result?.targetId).toBe('src/app.ts');
    expect(result?.targetType).toBe('node');
    expect(result?.eligibleItems.map(item => item.label)).toEqual(['Node Action', 'Both Action']);
  });

  it('classifies an edge selection correctly', () => {
    const result = classifyTarget(
      { kind: 'edge', targets: [], edgeId: 'src/a.ts->src/b.ts' },
      pluginItems
    );

    expect(result).not.toBeNull();
    expect(result?.targetId).toBe('src/a.ts->src/b.ts');
    expect(result?.targetType).toBe('edge');
    expect(result?.eligibleItems.map(item => item.label)).toEqual(['Edge Action', 'Both Action']);
  });

  it('returns null for a multi-node selection', () => {
    const result = classifyTarget(
      { kind: 'node', targets: ['src/a.ts', 'src/b.ts'] },
      pluginItems
    );

    expect(result).toBeNull();
  });

  it('returns null for a background selection', () => {
    const result = classifyTarget(
      { kind: 'background', targets: [] },
      pluginItems
    );

    expect(result).toBeNull();
  });

  it('returns null for an edge selection without an edgeId', () => {
    const result = classifyTarget(
      { kind: 'edge', targets: [] },
      pluginItems
    );

    expect(result).toBeNull();
  });

  it('returns an empty eligibleItems array when no plugin items match the target type', () => {
    const result = classifyTarget(
      { kind: 'node', targets: ['src/app.ts'] },
      [{ label: 'Edge Only', when: 'edge', pluginId: 'acme', index: 0 }]
    );

    expect(result?.eligibleItems).toHaveLength(0);
  });
});
