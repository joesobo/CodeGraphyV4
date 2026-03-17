import * as path from 'path';
import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/types';
import { buildGraphViewTimelineGraphData } from '../../../../src/extension/graphView/timeline/graph';

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

describe('graphView/timeline/graph', () => {
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

  it('keeps all nodes when showOrphans is enabled', () => {
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

    expect(graphData.nodes).toBe(rawGraphData.nodes);
    expect(graphData.nodes.map((node) => node.id)).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
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

  it('returns the original edge array when no plugin or rule filters are disabled', () => {
    const getPluginForFile = vi.fn(() => ({ id: 'codegraphy.typescript' }));

    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: new Set<string>(),
      disabledRules: new Set<string>(),
      showOrphans: true,
      workspaceRoot: '/workspace',
      registry: { getPluginForFile },
    });

    expect(graphData.edges).toBe(rawGraphData.edges);
    expect(getPluginForFile).not.toHaveBeenCalled();
  });

  it('returns the original edge array when the registry is missing', () => {
    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      disabledRules: new Set<string>(),
      showOrphans: true,
      workspaceRoot: '/workspace',
    });

    expect(graphData.edges).toBe(rawGraphData.edges);
  });

  it('returns the original edge array when the workspace root is missing', () => {
    const getPluginForFile = vi.fn(() => ({ id: 'codegraphy.typescript' }));

    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      disabledRules: new Set<string>(),
      showOrphans: true,
      registry: { getPluginForFile },
    });

    expect(graphData.edges).toBe(rawGraphData.edges);
    expect(getPluginForFile).not.toHaveBeenCalled();
  });

  it('keeps edges when the registry cannot resolve a plugin for the source file', () => {
    const getPluginForFile = vi.fn((filePath: string) => {
      if (filePath === path.join('/workspace', 'src/a.ts')) {
        return undefined;
      }

      return { id: 'codegraphy.python' };
    });

    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: new Set(['codegraphy.typescript']),
      disabledRules: new Set<string>(),
      showOrphans: true,
      workspaceRoot: '/workspace',
      registry: { getPluginForFile },
    });

    expect(graphData.edges).toEqual(rawGraphData.edges);
    expect(getPluginForFile).toHaveBeenNthCalledWith(1, path.join('/workspace', 'src/a.ts'));
    expect(getPluginForFile).toHaveBeenNthCalledWith(2, path.join('/workspace', 'src/c.ts'));
  });
});
