import type { IGraphNode } from '@codegraphy-dev/core';
import { FILE_TYPE_COLORS } from '@codegraphy-dev/core/file-colors';
import { describe, expect, it } from 'vitest';
import { createNodeColorMap } from './model';

describe('tldraw node color', () => {
  it('maps Core-resolved colors to native tldraw colors', () => {
    const nodes = [
      { id: 'src/app.ts', label: 'app.ts', color: FILE_TYPE_COLORS['.ts'], nodeType: 'file' },
      { id: 'tests/app.ts', label: 'app.ts', color: FILE_TYPE_COLORS['.ts'], nodeType: 'file' },
      { id: 'tools/build.py', label: 'build.py', color: FILE_TYPE_COLORS['.json'], nodeType: 'file' },
    ] satisfies IGraphNode[];

    const colors = createNodeColorMap(nodes);

    expect(colors.get('src/app.ts')).toBe(colors.get('tests/app.ts'));
    expect(colors.get('src/app.ts')).not.toBe(colors.get('tools/build.py'));
  });

  it('uses all ten native colors for the Core file palette', () => {
    const nodes: IGraphNode[] = Object.values(FILE_TYPE_COLORS).map((color, index) => ({
      id: `file-${index}`,
      label: `file-${index}`,
      color,
      nodeType: 'file',
    }));

    expect(new Set(createNodeColorMap(nodes).values()).size).toBe(10);
  });

  it('keeps colors stable when another node is added', () => {
    const firstGraph = [
      { id: 'src/app.ts', label: 'app.ts', color: FILE_TYPE_COLORS['.ts'], nodeType: 'file' },
      { id: 'tools/build.py', label: 'build.py', color: FILE_TYPE_COLORS['.json'], nodeType: 'file' },
    ] satisfies IGraphNode[];
    const refreshedGraph = [
      { id: 'README.md', label: 'README.md', color: FILE_TYPE_COLORS['.md'], nodeType: 'file' },
      ...firstGraph,
    ] satisfies IGraphNode[];

    const initialColors = createNodeColorMap(firstGraph);
    const refreshedColors = createNodeColorMap(refreshedGraph);

    expect(refreshedColors.get('src/app.ts')).toBe(initialColors.get('src/app.ts'));
    expect(refreshedColors.get('tools/build.py')).toBe(initialColors.get('tools/build.py'));
  });
});
