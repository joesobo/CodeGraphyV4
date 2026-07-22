import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '@codegraphy-dev/core';
import { createNodeColorMap, nodeExtensionGroup } from './model';

describe('tldraw node color', () => {
  it('normalizes extension groups for arbitrary workspace paths', () => {
    expect(nodeExtensionGroup('src/App.TS')).toBe('.ts');
    expect(nodeExtensionGroup('src\\components\\view.TSX')).toBe('.tsx');
    expect(nodeExtensionGroup('.gitignore')).toBe('.gitignore');
    expect(nodeExtensionGroup('Makefile')).toBe('[no extension]');
  });

  it('assigns the same native color to the same extension', () => {
    const nodes = [
      { id: 'src/app.ts', label: 'app.ts', color: '#111111', nodeType: 'file' },
      { id: 'tests/app.TS', label: 'app.TS', color: '#222222', nodeType: 'file' },
      { id: 'tools/build.py', label: 'build.py', color: '#333333', nodeType: 'file' },
    ] satisfies IGraphNode[];

    const colors = createNodeColorMap(nodes);

    expect(colors.get('src/app.ts')).toBe(colors.get('tests/app.TS'));
    expect(colors.get('src/app.ts')).not.toBe(colors.get('tools/build.py'));
  });

  it('uses all ten palette colors before cycling for larger workspaces', () => {
    const nodes: IGraphNode[] = Array.from({ length: 11 }, (_, index) => ({
      id: `file.ext${String(index).padStart(2, '0')}`,
      label: `file.ext${String(index).padStart(2, '0')}`,
      color: '#111111',
      nodeType: 'file',
    }));
    const assigned = [...createNodeColorMap(nodes).values()];

    expect(new Set(assigned.slice(0, 10)).size).toBe(10);
    expect(assigned[10]).toBe(assigned[0]);
  });
});
