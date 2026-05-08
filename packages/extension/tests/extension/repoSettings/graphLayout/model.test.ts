import { describe, expect, it } from 'vitest';
import {
  assignGraphLayoutOwner,
  createGraphLayoutSection,
  createDefaultGraphLayoutSettings,
  deleteGraphLayoutSection,
  normalizeGraphLayoutSettings,
  updateGraphLayoutSection,
  wouldCreateGraphLayoutOwnershipCycle,
} from '../../../../src/extension/repoSettings/graphLayout/model';

describe('extension/repoSettings/graphLayout/model', () => {
  it('creates empty layout state for pins, sections, and ownership', () => {
    expect(createDefaultGraphLayoutSettings()).toEqual({
      pinnedNodes: {},
      sections: {},
      ownership: {},
    });
  });

  it('keeps dormant pin and node ownership records without requiring visible graph nodes', () => {
    expect(normalizeGraphLayoutSettings({
      pinnedNodes: {
        'src/missing.ts': {
          nodeId: 'src/missing.ts',
          twoDimensional: { x: 120, y: -40 },
          threeDimensional: { x: 12, y: 24, z: -6 },
          updatedAt: '2026-05-07T08:00:00.000Z',
        },
      },
      sections: {
        'section-a': {
          id: 'section-a',
          label: 'UI Layer',
          color: '#4488ff',
          x: 10,
          y: 20,
          width: 300,
          height: 180,
          collapsed: false,
          updatedAt: '2026-05-07T08:01:00.000Z',
        },
      },
      ownership: {
        'src/missing.ts': {
          itemId: 'src/missing.ts',
          itemKind: 'node',
          ownerSectionId: 'section-a',
          updatedAt: '2026-05-07T08:02:00.000Z',
        },
      },
    })).toEqual({
      pinnedNodes: {
        'src/missing.ts': {
          nodeId: 'src/missing.ts',
          twoDimensional: { x: 120, y: -40 },
          threeDimensional: { x: 12, y: 24, z: -6 },
          updatedAt: '2026-05-07T08:00:00.000Z',
        },
      },
      sections: {
        'section-a': {
          id: 'section-a',
          label: 'UI Layer',
          color: '#4488ff',
          x: 10,
          y: 20,
          width: 300,
          height: 180,
          collapsed: false,
          updatedAt: '2026-05-07T08:01:00.000Z',
        },
      },
      ownership: {
        'src/missing.ts': {
          itemId: 'src/missing.ts',
          itemKind: 'node',
          ownerSectionId: 'section-a',
          updatedAt: '2026-05-07T08:02:00.000Z',
        },
      },
    });
  });

  it('normalizes malformed layout records before settings are persisted', () => {
    expect(normalizeGraphLayoutSettings({
      pinnedNodes: {
        good: {
          nodeId: 'good',
          twoDimensional: { x: 1, y: 2 },
          threeDimensional: { x: 3, y: 4, z: 5 },
          updatedAt: '2026-05-07T08:00:00.000Z',
        },
        mismatch: {
          nodeId: 'other-id',
          twoDimensional: { x: 1, y: 2 },
          updatedAt: '2026-05-07T08:00:00.000Z',
        },
        invalidCoordinate: {
          nodeId: 'invalidCoordinate',
          twoDimensional: { x: Number.POSITIVE_INFINITY, y: 2 },
          updatedAt: '2026-05-07T08:00:00.000Z',
        },
      },
      sections: {
        'section-a': {
          id: 'section-a',
          label: 'Section A',
          color: '#223344',
          x: 0,
          y: 0,
          width: 120,
          height: 100,
          collapsed: true,
          updatedAt: '2026-05-07T08:01:00.000Z',
        },
        'bad-section': {
          id: 'bad-section',
          label: '',
          color: '#223344',
          x: 0,
          y: 0,
          width: 0,
          height: 100,
          collapsed: false,
          updatedAt: '2026-05-07T08:01:00.000Z',
        },
      },
      ownership: {
        good: {
          itemId: 'good',
          itemKind: 'node',
          ownerSectionId: 'section-a',
          updatedAt: '2026-05-07T08:02:00.000Z',
        },
        orphanedOwner: {
          itemId: 'orphanedOwner',
          itemKind: 'node',
          ownerSectionId: 'missing-section',
          updatedAt: '2026-05-07T08:02:00.000Z',
        },
      },
      stray: true,
    })).toEqual({
      pinnedNodes: {
        good: {
          nodeId: 'good',
          twoDimensional: { x: 1, y: 2 },
          threeDimensional: { x: 3, y: 4, z: 5 },
          updatedAt: '2026-05-07T08:00:00.000Z',
        },
      },
      sections: {
        'section-a': {
          id: 'section-a',
          label: 'Section A',
          color: '#223344',
          x: 0,
          y: 0,
          width: 120,
          height: 100,
          collapsed: true,
          updatedAt: '2026-05-07T08:01:00.000Z',
        },
      },
      ownership: {
        good: {
          itemId: 'good',
          itemKind: 'node',
          ownerSectionId: 'section-a',
          updatedAt: '2026-05-07T08:02:00.000Z',
        },
      },
    });
  });

  it('prevents section ownership cycles', () => {
    const ownership = {
      'section-a': {
        itemId: 'section-a',
        itemKind: 'section' as const,
        ownerSectionId: 'section-b',
        updatedAt: '2026-05-07T08:02:00.000Z',
      },
      'section-b': {
        itemId: 'section-b',
        itemKind: 'section' as const,
        ownerSectionId: null,
        updatedAt: '2026-05-07T08:03:00.000Z',
      },
    };

    expect(wouldCreateGraphLayoutOwnershipCycle(
      ownership,
      'section-b',
      'section-a',
    )).toBe(true);
    expect(wouldCreateGraphLayoutOwnershipCycle(
      ownership,
      'section-b',
      null,
    )).toBe(false);
  });

  it('throws instead of assigning a section to its own descendant', () => {
    const layout = normalizeGraphLayoutSettings({
      sections: {
        'section-a': {
          id: 'section-a',
          label: 'Section A',
          color: '#223344',
          x: 0,
          y: 0,
          width: 120,
          height: 100,
          collapsed: false,
          updatedAt: '2026-05-07T08:01:00.000Z',
        },
        'section-b': {
          id: 'section-b',
          label: 'Section B',
          color: '#446688',
          x: 20,
          y: 20,
          width: 120,
          height: 100,
          collapsed: false,
          updatedAt: '2026-05-07T08:01:00.000Z',
        },
      },
      ownership: {
        'section-b': {
          itemId: 'section-b',
          itemKind: 'section',
          ownerSectionId: 'section-a',
          updatedAt: '2026-05-07T08:02:00.000Z',
        },
      },
    });

    expect(() => assignGraphLayoutOwner(layout, {
      itemId: 'section-a',
      itemKind: 'section',
      ownerSectionId: 'section-b',
      updatedAt: '2026-05-07T08:03:00.000Z',
    })).toThrow('Graph Section ownership cannot create a cycle.');
  });

  it('creates generated Graph Sections and assigns selected nodes as members', () => {
    const layout = createGraphLayoutSection(createDefaultGraphLayoutSettings(), {
      color: '#60a5fa',
      height: 180,
      memberNodeIds: ['src/app.ts', 'src/utils.ts', 'src/app.ts'],
      updatedAt: '2026-05-07T09:00:00.000Z',
      width: 280,
      x: -140,
      y: -90,
    });

    expect(layout.sections).toEqual({
      'section-1': {
        id: 'section-1',
        label: 'Section 1',
        color: '#60a5fa',
        x: -140,
        y: -90,
        width: 280,
        height: 180,
        collapsed: false,
        updatedAt: '2026-05-07T09:00:00.000Z',
      },
    });
    expect(layout.ownership).toEqual({
      'src/app.ts': {
        itemId: 'src/app.ts',
        itemKind: 'node',
        ownerSectionId: 'section-1',
        updatedAt: '2026-05-07T09:00:00.000Z',
      },
      'src/utils.ts': {
        itemId: 'src/utils.ts',
        itemKind: 'node',
        ownerSectionId: 'section-1',
        updatedAt: '2026-05-07T09:00:00.000Z',
      },
    });
  });

  it('updates Graph Section presentation and bounds without changing membership', () => {
    const layout = createGraphLayoutSection(createDefaultGraphLayoutSettings(), {
      color: '#60a5fa',
      height: 180,
      memberNodeIds: ['src/app.ts'],
      updatedAt: '2026-05-07T09:00:00.000Z',
      width: 280,
      x: -140,
      y: -90,
    });

    const updated = updateGraphLayoutSection(layout, {
      sectionId: 'section-1',
      updates: {
        color: '#22c55e',
        height: 210,
        label: 'UI Work',
        width: 320,
        x: -120,
        y: -80,
      },
      updatedAt: '2026-05-07T09:15:00.000Z',
    });

    expect(updated.sections['section-1']).toEqual({
      id: 'section-1',
      label: 'UI Work',
      color: '#22c55e',
      x: -120,
      y: -80,
      width: 320,
      height: 210,
      collapsed: false,
      updatedAt: '2026-05-07T09:15:00.000Z',
    });
    expect(updated.ownership['src/app.ts']).toEqual(layout.ownership['src/app.ts']);
  });

  it('creates nested Graph Sections and assigns selected sections as direct children', () => {
    const parentLayout = createGraphLayoutSection(createDefaultGraphLayoutSettings(), {
      height: 240,
      updatedAt: '2026-05-07T09:00:00.000Z',
      width: 360,
      x: 0,
      y: 0,
    });
    const childLayout = createGraphLayoutSection(parentLayout, {
      height: 120,
      ownerSectionId: 'section-1',
      updatedAt: '2026-05-07T09:05:00.000Z',
      width: 180,
      x: 40,
      y: 40,
    });

    const wrapperLayout = createGraphLayoutSection(childLayout, {
      height: 180,
      memberNodeIds: ['src/app.ts'],
      memberSectionIds: ['section-2'],
      ownerSectionId: 'section-1',
      updatedAt: '2026-05-07T09:10:00.000Z',
      width: 260,
      x: 20,
      y: 20,
    });

    expect(parentLayout.ownership).toEqual({});
    expect(childLayout.ownership['section-2']).toEqual({
      itemId: 'section-2',
      itemKind: 'section',
      ownerSectionId: 'section-1',
      updatedAt: '2026-05-07T09:05:00.000Z',
    });
    expect(wrapperLayout.ownership['section-3']).toEqual({
      itemId: 'section-3',
      itemKind: 'section',
      ownerSectionId: 'section-1',
      updatedAt: '2026-05-07T09:10:00.000Z',
    });
    expect(wrapperLayout.ownership['section-2']).toEqual({
      itemId: 'section-2',
      itemKind: 'section',
      ownerSectionId: 'section-3',
      updatedAt: '2026-05-07T09:10:00.000Z',
    });
    expect(wrapperLayout.ownership['src/app.ts']).toEqual({
      itemId: 'src/app.ts',
      itemKind: 'node',
      ownerSectionId: 'section-3',
      updatedAt: '2026-05-07T09:10:00.000Z',
    });
  });

  it('moves descendant sections and pinned member coordinates with the parent Section Frame', () => {
    const layout = normalizeGraphLayoutSettings({
      pinnedNodes: {
        'src/app.ts': {
          nodeId: 'src/app.ts',
          twoDimensional: { x: 60, y: 70 },
          threeDimensional: { x: 1, y: 2, z: 3 },
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
      sections: {
        'section-1': {
          id: 'section-1',
          label: 'Parent',
          color: '#60a5fa',
          x: 0,
          y: 0,
          width: 300,
          height: 220,
          collapsed: false,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
        'section-2': {
          id: 'section-2',
          label: 'Child',
          color: '#22c55e',
          x: 40,
          y: 40,
          width: 120,
          height: 90,
          collapsed: false,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
      ownership: {
        'section-2': {
          itemId: 'section-2',
          itemKind: 'section',
          ownerSectionId: 'section-1',
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
        'src/app.ts': {
          itemId: 'src/app.ts',
          itemKind: 'node',
          ownerSectionId: 'section-2',
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
    });

    const moved = updateGraphLayoutSection(layout, {
      sectionId: 'section-1',
      updates: { x: 25, y: -10 },
      updatedAt: '2026-05-07T09:15:00.000Z',
    });

    expect(moved.sections['section-1']).toMatchObject({ x: 25, y: -10 });
    expect(moved.sections['section-2']).toMatchObject({ x: 65, y: 30 });
    expect(moved.pinnedNodes['src/app.ts']).toEqual({
      nodeId: 'src/app.ts',
      twoDimensional: { x: 85, y: 60 },
      threeDimensional: { x: 1, y: 2, z: 3 },
      updatedAt: '2026-05-07T09:15:00.000Z',
    });
  });

  it('deletes only a Graph Section by promoting direct children to the deleted section owner', () => {
    const layout = normalizeGraphLayoutSettings({
      pinnedNodes: {
        'section-2': {
          nodeId: 'section-2',
          twoDimensional: { x: 40, y: 40 },
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
      sections: {
        'section-1': {
          id: 'section-1',
          label: 'Parent',
          color: '#60a5fa',
          x: 0,
          y: 0,
          width: 300,
          height: 220,
          collapsed: false,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
        'section-2': {
          id: 'section-2',
          label: 'Deleted',
          color: '#22c55e',
          x: 40,
          y: 40,
          width: 120,
          height: 90,
          collapsed: false,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
        'section-3': {
          id: 'section-3',
          label: 'Child',
          color: '#f59e0b',
          x: 60,
          y: 60,
          width: 80,
          height: 70,
          collapsed: false,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
      ownership: {
        'section-2': {
          itemId: 'section-2',
          itemKind: 'section',
          ownerSectionId: 'section-1',
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
        'section-3': {
          itemId: 'section-3',
          itemKind: 'section',
          ownerSectionId: 'section-2',
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
        'src/app.ts': {
          itemId: 'src/app.ts',
          itemKind: 'node',
          ownerSectionId: 'section-2',
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
    });

    const nextLayout = deleteGraphLayoutSection(layout, {
      sectionId: 'section-2',
      updatedAt: '2026-05-07T09:20:00.000Z',
    });

    expect(nextLayout.sections['section-2']).toBeUndefined();
    expect(nextLayout.pinnedNodes['section-2']).toBeUndefined();
    expect(nextLayout.ownership['section-2']).toBeUndefined();
    expect(nextLayout.ownership['section-3']).toEqual({
      itemId: 'section-3',
      itemKind: 'section',
      ownerSectionId: 'section-1',
      updatedAt: '2026-05-07T09:20:00.000Z',
    });
    expect(nextLayout.ownership['src/app.ts']).toEqual({
      itemId: 'src/app.ts',
      itemKind: 'node',
      ownerSectionId: 'section-1',
      updatedAt: '2026-05-07T09:20:00.000Z',
    });
  });
});
