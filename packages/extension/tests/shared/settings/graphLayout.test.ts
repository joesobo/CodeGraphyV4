import { describe, expect, it } from 'vitest';
import type {
  GraphLayoutOwnership,
  GraphLayoutSection,
} from '../../../src/shared/settings/graphLayout';
import {
  getGraphLayoutSectionDepth,
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
  it('walks nested Section ancestry for descendant checks and depth', () => {
    expect(isGraphLayoutSectionDescendant(OWNERSHIP, 'grandchild', 'parent')).toBe(true);
    expect(isGraphLayoutSectionDescendant(OWNERSHIP, 'child', 'grandchild')).toBe(false);
    expect(getGraphLayoutSectionDepth(OWNERSHIP, 'grandchild')).toBe(2);
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
});
