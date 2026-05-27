import { describe, expect, it } from 'vitest';
import type {
  GraphLayoutSettings,
  GraphLayoutOwnership,
  GraphLayoutSection,
} from '../../../src/shared/settings/graphLayout';
import {
  findDeepestGraphLayoutSectionAtPoint,
  getDefaultGraphSectionSize,
  getGraphLayoutSectionDepth,
  isGraphLayoutItemOwnedBySection,
  isGraphLayoutSectionDescendant,
  isGraphLayoutSectionVisible,
} from '../../../src/shared/settings/graphLayout';

const SECTIONS: Record<string, GraphLayoutSection> = {
  parent: {
    id: 'parent',
    label: 'Parent',
    color: '#60a5fa',
    x: 0,
    y: 0,
    width: 300,
    height: 200,
    collapsed: false,
    updatedAt: '2026-05-07T09:00:00.000Z',
  },
  child: {
    id: 'child',
    label: 'Child',
    color: '#22c55e',
    x: 40,
    y: 40,
    width: 120,
    height: 90,
    collapsed: false,
    updatedAt: '2026-05-07T09:00:00.000Z',
  },
  grandchild: {
    id: 'grandchild',
    label: 'Grandchild',
    color: '#f59e0b',
    x: 60,
    y: 60,
    width: 80,
    height: 70,
    collapsed: false,
    updatedAt: '2026-05-07T09:00:00.000Z',
  },
};

const OWNERSHIP: Record<string, GraphLayoutOwnership> = {
  parent: {
    itemId: 'parent',
    itemKind: 'section',
    ownerSectionId: null,
    updatedAt: '2026-05-07T09:00:00.000Z',
  },
  child: {
    itemId: 'child',
    itemKind: 'section',
    ownerSectionId: 'parent',
    updatedAt: '2026-05-07T09:00:00.000Z',
  },
  grandchild: {
    itemId: 'grandchild',
    itemKind: 'section',
    ownerSectionId: 'child',
    updatedAt: '2026-05-07T09:00:00.000Z',
  },
};

describe('shared/settings/graphLayout', () => {
  it('uses a stable graph-space default size for new Graph Sections', () => {
    expect(getDefaultGraphSectionSize()).toEqual({ height: 180, width: 280 });
    expect(getDefaultGraphSectionSize(0.2)).toEqual({ height: 180, width: 280 });
  });

  it('walks nested Section ancestry for descendant checks and depth', () => {
    expect(isGraphLayoutSectionDescendant(OWNERSHIP, 'grandchild', 'parent')).toBe(true);
    expect(isGraphLayoutSectionDescendant(OWNERSHIP, 'child', 'grandchild')).toBe(false);
    expect(getGraphLayoutSectionDepth(OWNERSHIP, 'grandchild')).toBe(2);
  });

  it('checks whether items are owned by a Section directly or through a descendant Section', () => {
    const ownership: Record<string, GraphLayoutOwnership> = {
      ...OWNERSHIP,
      'src/app.ts': {
        itemId: 'src/app.ts',
        itemKind: 'node',
        ownerSectionId: 'grandchild',
        updatedAt: '2026-05-07T09:00:00.000Z',
      },
      'src/root.ts': {
        itemId: 'src/root.ts',
        itemKind: 'node',
        ownerSectionId: null,
        updatedAt: '2026-05-07T09:00:00.000Z',
      },
    };

    expect(isGraphLayoutItemOwnedBySection(ownership, 'src/app.ts', 'grandchild')).toBe(true);
    expect(isGraphLayoutItemOwnedBySection(ownership, 'src/app.ts', 'parent')).toBe(true);
    expect(isGraphLayoutItemOwnedBySection(ownership, 'src/root.ts', 'parent')).toBe(false);
    expect(isGraphLayoutItemOwnedBySection(ownership, 'missing.ts', 'parent')).toBe(false);
  });

  it('shows sections only when the section and its ancestors are expanded', () => {
    expect(isGraphLayoutSectionVisible(SECTIONS, OWNERSHIP, 'grandchild')).toBe(true);
    expect(isGraphLayoutSectionVisible({
      ...SECTIONS,
      parent: { ...SECTIONS.parent, collapsed: true },
    }, OWNERSHIP, 'grandchild')).toBe(false);
    expect(isGraphLayoutSectionVisible(SECTIONS, OWNERSHIP, 'missing')).toBe(false);
  });

  it('treats cyclic Section ancestry as hidden', () => {
    const cycleOwnership: Record<string, GraphLayoutOwnership> = {
      ...OWNERSHIP,
      parent: {
        itemId: 'parent',
        itemKind: 'section',
        ownerSectionId: 'grandchild',
        updatedAt: '2026-05-07T09:00:00.000Z',
      },
    };

    expect(isGraphLayoutSectionVisible(SECTIONS, cycleOwnership, 'grandchild')).toBe(false);
    expect(getGraphLayoutSectionDepth(cycleOwnership, 'grandchild')).toBe(2);
  });

  it('finds the deepest visible Section at a graph-space point and breaks depth ties by area', () => {
    const layout: Pick<GraphLayoutSettings, 'ownership' | 'sections'> = {
      sections: {
        ...SECTIONS,
        sibling: {
          id: 'sibling',
          label: 'Sibling',
          color: '#f43f5e',
          x: 60,
          y: 60,
          width: 40,
          height: 40,
          collapsed: false,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
        hidden: {
          id: 'hidden',
          label: 'Hidden',
          color: '#64748b',
          x: 65,
          y: 65,
          width: 20,
          height: 20,
          collapsed: true,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
      ownership: {
        ...OWNERSHIP,
        sibling: {
          itemId: 'sibling',
          itemKind: 'section',
          ownerSectionId: 'child',
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
        hidden: {
          itemId: 'hidden',
          itemKind: 'section',
          ownerSectionId: null,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
    };

    expect(findDeepestGraphLayoutSectionAtPoint(layout, { x: 70, y: 70 })).toBe('sibling');
    expect(findDeepestGraphLayoutSectionAtPoint(layout, { x: 20, y: 20 })).toBe('parent');
    expect(findDeepestGraphLayoutSectionAtPoint(layout, { x: 320, y: 240 })).toBeNull();
  });
});
