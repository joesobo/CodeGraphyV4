import type { IGraphNode } from '@codegraphy-dev/core';
import { describe, expect, it } from 'vitest';
import { createNodeColorMap } from '../../../src/document/nodeColor/model';

function fileNode(id: string): IGraphNode {
  return { id, label: id, nodeType: 'file' };
}

describe('tldraw node color', () => {
  it('maps file extensions to native tldraw colors', () => {
    const nodes = [
      fileNode('src/app.ts'),
      fileNode('tests/app.ts'),
      fileNode('tools/build.py'),
    ];

    const colors = createNodeColorMap(nodes);

    expect(colors.get('src/app.ts')).toBe(colors.get('tests/app.ts'));
    expect(colors.get('src/app.ts')).not.toBe(colors.get('tools/build.py'));
  });

  it('uses all ten native colors for its common file-extension palette', () => {
    const extensions = ['ts', 'tsx', 'js', 'jsx', 'css', 'scss', 'json', 'md', 'html', 'svg'];
    const nodes = extensions.map(extension => fileNode(`file.${extension}`));

    expect(new Set(createNodeColorMap(nodes).values()).size).toBe(10);
  });

  it('keeps colors stable when another node is added', () => {
    const firstGraph = [
      fileNode('src/app.ts'),
      fileNode('tools/build.py'),
    ];
    const refreshedGraph = [
      fileNode('README.md'),
      ...firstGraph,
    ];

    const initialColors = createNodeColorMap(firstGraph);
    const refreshedColors = createNodeColorMap(refreshedGraph);

    expect(refreshedColors.get('src/app.ts')).toBe(initialColors.get('src/app.ts'));
    expect(refreshedColors.get('tools/build.py')).toBe(initialColors.get('tools/build.py'));
  });
});
