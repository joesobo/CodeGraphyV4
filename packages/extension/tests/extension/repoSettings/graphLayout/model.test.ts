import { describe, expect, it } from 'vitest';
import {
  assignGraphLayoutOwner,
  createDefaultGraphLayoutSettings,
  normalizeGraphLayoutSettings,
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
});
