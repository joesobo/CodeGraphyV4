import { describe, expect, it } from 'vitest';
import type { GraphLayoutOwnership, GraphLayoutSection } from '../../../../src/shared/settings/graphLayout';
import {
  getSectionFrameDisplaySection,
  getSectionFrameDragUpdate,
  getSectionFrameRect,
  getVisibleSectionFrames,
} from '../../../../src/webview/components/graph/sectionFrames/model';

const section: GraphLayoutSection = {
  id: 'section-1',
  label: 'Section 1',
  color: '#60a5fa',
  x: -140,
  y: -90,
  width: 280,
  height: 180,
  collapsed: false,
  updatedAt: '2026-05-07T09:00:00.000Z',
};

describe('graph/sectionFrames/model', () => {
  it('converts Section Frame bounds through graph-to-screen coordinates', () => {
    expect(getSectionFrameRect({
      graph2ScreenCoords: (x, y) => ({ x: x + 200, y: y + 150 }),
    }, section)).toEqual({
      height: 180,
      left: 60,
      top: 60,
      width: 280,
    });
  });

  it('uses live Section Node coordinates for the editable frame when physics moves the section', () => {
    const displaySection = getSectionFrameDisplaySection(section, {
      id: 'section-1',
      sectionHeight: 210,
      sectionWidth: 320,
      x: 25,
      y: 40,
    });

    expect(getSectionFrameRect({
      graph2ScreenCoords: (x, y) => ({ x: x + 200, y: y + 150 }),
    }, displaySection)).toEqual({
      height: 210,
      left: 225,
      top: 190,
      width: 320,
    });
  });

  it('uses graph coordinates directly when graph coordinate helpers are unavailable', () => {
    expect(getSectionFrameRect(undefined, section)).toEqual({
      height: 180,
      left: -140,
      top: -90,
      width: 280,
    });
  });

  it('uses graph coordinates directly when the graph object has no screen transform', () => {
    expect(getSectionFrameRect({}, section)).toEqual({
      height: 180,
      left: -140,
      top: -90,
      width: 280,
    });
  });

  it('creates move and resize updates from graph-space drag deltas', () => {
    const graph = {
      screen2GraphCoords: (x: number, y: number) => ({ x: x - 200, y: y - 150 }),
    };

    expect(getSectionFrameDragUpdate(graph, {
      clientX: 60,
      clientY: 60,
      section,
      type: 'move',
    }, { clientX: 100, clientY: 90 })).toEqual({
      sectionId: 'section-1',
      updates: { x: -100, y: -60 },
    });

    expect(getSectionFrameDragUpdate(graph, {
      clientX: 340,
      clientY: 240,
      section,
      type: 'resize',
    }, { clientX: 380, clientY: 270 })).toEqual({
      sectionId: 'section-1',
      updates: { height: 210, width: 320 },
    });
  });

  it('keeps resized Section Frames above the minimum size', () => {
    expect(getSectionFrameDragUpdate(undefined, {
      clientX: 0,
      clientY: 0,
      section,
      type: 'resize',
    }, { clientX: -500, clientY: -500 })).toEqual({
      sectionId: 'section-1',
      updates: { height: 80, width: 80 },
    });
  });

  it('uses screen coordinates directly when the graph object has no graph transform', () => {
    expect(getSectionFrameDragUpdate({}, {
      clientX: 60,
      clientY: 60,
      section,
      type: 'move',
    }, { clientX: 100, clientY: 90 })).toEqual({
      sectionId: 'section-1',
      updates: { x: -100, y: -60 },
    });
  });

  it('throws when a drag update receives an unknown drag type', () => {
    expect(() => getSectionFrameDragUpdate(undefined, {
      clientX: 0,
      clientY: 0,
      section,
      type: 'other',
    } as never, { clientX: 1, clientY: 1 })).toThrow('Unknown Section Frame drag type.');
  });

  it('filters visible frames by section ancestry and render order', () => {
    const ownership: Record<string, GraphLayoutOwnership> = {
      'section-1': {
        itemId: 'section-1',
        itemKind: 'section',
        ownerSectionId: null,
        updatedAt: '2026-05-07T09:00:00.000Z',
      },
      'section-2': {
        itemId: 'section-2',
        itemKind: 'section',
        ownerSectionId: 'section-1',
        updatedAt: '2026-05-07T09:00:00.000Z',
      },
    };

    expect(getVisibleSectionFrames([
      { ...section, id: 'section-2', label: 'Child', x: 10, y: 10 },
      section,
    ], ownership).map(frame => frame.id)).toEqual(['section-1', 'section-2']);
    expect(getVisibleSectionFrames([
      { ...section, collapsed: true },
      { ...section, id: 'section-2', label: 'Child', x: 10, y: 10 },
    ], ownership)).toEqual([]);
  });

});
