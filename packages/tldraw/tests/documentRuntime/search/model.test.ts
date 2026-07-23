import { describe, expect, it } from 'vitest';
import {
  createSearchProjection,
  graphSearchEventName,
} from '../../../src/documentRuntime/search/model';
import type { ScriptShape } from '../../../src/documentRuntime/physics/shape/model';

const appNode = {
  id: 'shape:app',
  type: 'geo',
  x: 0,
  y: 0,
  props: { h: 120, w: 120 },
  meta: { codegraphyEntityId: 'src/App.tsx', codegraphyKind: 'node' },
} satisfies ScriptShape;
const themeNode = {
  id: 'shape:theme',
  type: 'geo',
  x: 0,
  y: 0,
  props: { h: 120, w: 120 },
  meta: { codegraphyEntityId: 'src/theme.css', codegraphyKind: 'node' },
} satisfies ScriptShape;
const appIcon = {
  id: 'shape:app-icon',
  type: 'image',
  x: 0,
  y: 0,
  props: { h: 56, w: 56 },
  meta: { codegraphyKind: 'icon', codegraphyNodeId: 'src/App.tsx' },
} satisfies ScriptShape;
const appLabel = {
  id: 'shape:app-label',
  type: 'text',
  x: 0,
  y: 0,
  props: { w: 180 },
  meta: { codegraphyKind: 'label', codegraphyNodeId: 'src/App.tsx' },
} satisfies ScriptShape;
const edge = {
  id: 'shape:edge',
  type: 'arrow',
  x: 0,
  y: 0,
  props: {},
  meta: {
    codegraphyFrom: 'src/App.tsx',
    codegraphyKind: 'edge',
    codegraphyTo: 'src/theme.css',
  },
} satisfies ScriptShape;
const userNote = {
  id: 'shape:user-note',
  type: 'note',
  x: 0,
  y: 0,
  props: {},
  meta: {},
} satisfies ScriptShape;

describe('CodeGraphy tldraw graph search model', () => {
  it('shows only case-insensitive node matches and their owned shapes', () => {
    const projection = createSearchProjection(
      [appNode, themeNode, appIcon, appLabel, edge, userNote],
      ' APP ',
    );

    expect(projection.visibleShapes.map(shape => shape.id)).toEqual([
      'shape:app',
      'shape:app-icon',
      'shape:app-label',
      'shape:user-note',
    ]);
    expect(projection.hiddenShapeIds).toEqual(new Set([
      'shape:theme',
      'shape:edge',
    ]));
  });

  it('restores the complete graph when the query is clear', () => {
    const shapes = [appNode, themeNode, appIcon, appLabel, edge, userNote];

    const projection = createSearchProjection(shapes, '  ');

    expect(projection.visibleShapes).toEqual(shapes);
    expect(projection.hiddenShapeIds.size).toBe(0);
  });

  it('uses a stable event name across the canvas UI and physics bundles', () => {
    expect(graphSearchEventName).toBe('codegraphy:graph-search');
  });
});
