import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../src/shared/types';
import { buildGraphViewTimelineGraphData } from '../../../src/extension/graphView/timelineGraph';

const rawGraphData: IGraphData = {
  nodes: [
    { id: 'src/a.ts', label: 'a.ts', color: '#111111' },
    { id: 'src/b.ts', label: 'b.ts', color: '#222222' },
    { id: 'src/c.ts', label: 'c.ts', color: '#333333' },
  ],
  edges: [
    { id: 'src/a.ts->src/b.ts', from: 'src/a.ts', to: 'src/b.ts', ruleId: 'import' },
    { id: 'src/c.ts->src/b.ts', from: 'src/c.ts', to: 'src/b.ts', ruleId: 'import' },
  ],
};

describe('graphView/timelineGraph', () => {
  it('filters out edges from disabled plugins', () => {
    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      disabledRules: new Set<string>(),
      showOrphans: true,
      workspaceRoot: '/workspace',
      registry: {
        getPluginForFile(filePath) {
          if (filePath.endsWith('src/a.ts')) {
            return { id: 'codegraphy.typescript' };
          }

          return { id: 'codegraphy.python' };
        },
      },
    });

    expect(graphData.edges).toEqual([
      { id: 'src/c.ts->src/b.ts', from: 'src/c.ts', to: 'src/b.ts', ruleId: 'import' },
    ]);
  });

  it('filters out edges from disabled rules', () => {
    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: new Set<string>(),
      disabledRules: new Set(['codegraphy.python:import']),
      showOrphans: true,
      workspaceRoot: '/workspace',
      registry: {
        getPluginForFile() {
          return { id: 'codegraphy.python' };
        },
      },
    });

    expect(graphData.edges).toEqual([]);
  });

  it('drops orphaned nodes when showOrphans is disabled', () => {
    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      disabledRules: new Set<string>(),
      showOrphans: false,
      workspaceRoot: '/workspace',
      registry: {
        getPluginForFile(filePath) {
          if (filePath.endsWith('src/a.ts')) {
            return { id: 'codegraphy.typescript' };
          }

          return { id: 'codegraphy.python' };
        },
      },
    });

    expect(graphData.nodes.map((node) => node.id)).toEqual(['src/b.ts', 'src/c.ts']);
  });
});
