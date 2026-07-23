import type { IGraphNode } from '@codegraphy-dev/core';
import { describe, expect, it } from 'vitest';
import { createNodeIconMap } from '../../../src/document/nodeIcon/model';

describe('tldraw node icons', () => {
  it('uses portable white Material Icon Theme SVGs with deterministic file-type matches', () => {
    const nodes = [
      { id: 'src/app.ts', label: 'app.ts', nodeType: 'file', color: '#000000' },
      { id: 'tests/app.ts', label: 'app.ts', nodeType: 'file', color: '#000000' },
      { id: 'tools/build.py', label: 'build.py', nodeType: 'file', color: '#000000' },
      { id: 'LICENSE', label: 'LICENSE', nodeType: 'file', color: '#000000' },
    ] satisfies IGraphNode[];

    const icons = createNodeIconMap(nodes);

    expect(icons.get('src/app.ts')?.name).toBe('typescript');
    expect(icons.get('tests/app.ts')).toEqual(icons.get('src/app.ts'));
    expect(icons.get('tools/build.py')?.name).toBe('python');
    expect(icons.get('LICENSE')?.name).toBe('license');
    expect(icons.get('src/app.ts')?.src).toMatch(/^data:image\/svg\+xml;base64,/);
    const encodedSvg = icons.get('src/app.ts')?.src.split(',')[1];
    expect(Buffer.from(encodedSvg ?? '', 'base64').toString('utf8')).toContain('#FFFFFF');
  });
});
