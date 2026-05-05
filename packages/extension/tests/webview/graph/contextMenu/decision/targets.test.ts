import { describe, expect, it } from 'vitest';
import {
  classifyGraphContextNodeTarget,
  classifyGraphContextNodeTargets,
  isPackageNodeId,
} from '../../../../../src/webview/components/graph/contextMenu/decision/targets';

describe('graph/contextMenu/decision/targets', () => {
  it('classifies one node target from id and node type', () => {
    expect(classifyGraphContextNodeTarget('src/app.ts', 'file')).toEqual({
      id: 'src/app.ts',
      nodeKind: 'file',
      nodeType: 'file',
    });
    expect(classifyGraphContextNodeTarget('src', 'folder')).toMatchObject({
      nodeKind: 'folder',
      nodeType: 'folder',
    });
    expect(classifyGraphContextNodeTarget('route:/home', 'route')).toMatchObject({
      nodeKind: 'plugin',
      nodeType: 'route',
    });
  });

  it('treats package ids and missing metadata as canonical node types', () => {
    expect(isPackageNodeId('pkg:react')).toBe(true);
    expect(classifyGraphContextNodeTarget('pkg:react', undefined)).toMatchObject({
      nodeKind: 'package',
      nodeType: 'package',
    });
    expect(classifyGraphContextNodeTarget('src/missing.ts', undefined)).toMatchObject({
      nodeKind: 'file',
      nodeType: 'file',
    });
  });

  it('uses explicit file metadata when the node source omits nodeType', () => {
    expect(classifyGraphContextNodeTargets(
      ['src/app.ts'],
      [{ id: 'src/app.ts' }],
    )).toEqual([
      { id: 'src/app.ts', nodeKind: 'file', nodeType: 'file' },
    ]);
  });
});
