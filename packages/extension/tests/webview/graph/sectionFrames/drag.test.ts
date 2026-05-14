import { describe, expect, it, vi } from 'vitest';
import type { GraphLayoutSection } from '../../../../src/shared/settings/graphLayout';
import {
  beginSectionFrameWindowDrag,
  isSectionFrameControl,
} from '../../../../src/webview/components/graph/sectionFrames/drag';

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

describe('graph/sectionFrames/drag', () => {
  it('updates once on window mouseup and removes the drag listener', () => {
    const onUpdateSection = vi.fn();

    beginSectionFrameWindowDrag(undefined, {
      clientX: 0,
      clientY: 0,
      section,
      type: 'move',
    }, onUpdateSection);

    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 10, clientY: 20 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 20, clientY: 30 }));

    expect(onUpdateSection).toHaveBeenCalledOnce();
    expect(onUpdateSection).toHaveBeenCalledWith('section-1', { x: -130, y: -70 });
  });

  it('moves the live Section Node while dragging before persisting on mouseup', () => {
    const onUpdateSection = vi.fn();
    const nodePosition = {
      id: 'section-1',
      sectionHeight: 180,
      sectionWidth: 280,
      x: 0,
      y: 0,
    };

    beginSectionFrameWindowDrag(undefined, {
      clientX: 0,
      clientY: 0,
      nodePosition,
      section,
      type: 'move',
    }, onUpdateSection);

    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 20 }));

    expect(nodePosition).toMatchObject({
      fx: 10,
      fy: 20,
      x: 10,
      y: 20,
    });
    expect(onUpdateSection).not.toHaveBeenCalled();

    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 10, clientY: 20 }));

    expect(nodePosition).toMatchObject({
      fx: undefined,
      fy: undefined,
      x: 10,
      y: 20,
    });
    expect(onUpdateSection).toHaveBeenCalledWith('section-1', { x: -130, y: -70 });
  });

  it('keeps graph physics alive while dragging the live Section Node', () => {
    const onUpdateSection = vi.fn();
    const onDragEnd = vi.fn();
    const graph = {
      d3ReheatSimulation: vi.fn(),
      resumeAnimation: vi.fn(),
    };
    const nodePosition = {
      id: 'section-1',
      sectionHeight: 180,
      sectionWidth: 280,
      x: 0,
      y: 0,
    };

    beginSectionFrameWindowDrag(graph, {
      clientX: 0,
      clientY: 0,
      nodePosition,
      section,
      type: 'move',
    }, onUpdateSection, onDragEnd);

    expect(nodePosition).toMatchObject({ isDragging: true });
    expect(graph.resumeAnimation).toHaveBeenCalledOnce();
    expect(graph.d3ReheatSimulation).toHaveBeenCalledOnce();

    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 20 }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 40 }));

    expect(graph.resumeAnimation).toHaveBeenCalledTimes(3);
    expect(graph.d3ReheatSimulation).toHaveBeenCalledTimes(3);

    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 20, clientY: 40 }));

    expect(nodePosition).toMatchObject({ isDragging: false });
    expect(onUpdateSection).toHaveBeenCalledWith('section-1', { x: -120, y: -50 });
    expect(onDragEnd).toHaveBeenCalledWith('section-1');
  });

  it('keeps live Section Node centers aligned when resizing the frame', () => {
    const onUpdateSection = vi.fn();
    const onDragEnd = vi.fn();
    const nodePosition = {
      id: 'section-1',
      sectionHeight: 180,
      sectionWidth: 280,
      x: 0,
      y: 0,
    };

    beginSectionFrameWindowDrag(undefined, {
      clientX: 0,
      clientY: 0,
      nodePosition,
      section,
      type: 'resize:southeast',
    }, onUpdateSection, onDragEnd);

    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 10 }));

    expect(nodePosition).toMatchObject({
      sectionHeight: 190,
      sectionWidth: 300,
      x: 10,
      y: 5,
    });
    expect(onUpdateSection).not.toHaveBeenCalled();

    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 20, clientY: 10 }));

    expect(onDragEnd).not.toHaveBeenCalled();
  });

  it('keeps live Section Node centers aligned when resizing from a top-left anchored handle', () => {
    const onUpdateSection = vi.fn();
    const nodePosition = {
      id: 'section-1',
      sectionHeight: 180,
      sectionWidth: 280,
      x: 0,
      y: 0,
    };

    beginSectionFrameWindowDrag(undefined, {
      clientX: 0,
      clientY: 0,
      nodePosition,
      section,
      type: 'resize:northwest',
    }, onUpdateSection);

    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 10 }));

    expect(nodePosition).toMatchObject({
      sectionHeight: 170,
      sectionWidth: 260,
      x: 10,
      y: 5,
    });
    expect(onUpdateSection).not.toHaveBeenCalled();

    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 20, clientY: 10 }));
  });

  it('detects Section Frame controls by data attribute ancestry', () => {
    const control = document.createElement('button');
    const wrapper = document.createElement('div');
    wrapper.dataset.graphSectionControl = 'true';
    wrapper.append(control);

    expect(isSectionFrameControl(control)).toBe(true);
    expect(isSectionFrameControl(document.createElement('div'))).toBe(false);
    expect(isSectionFrameControl(null)).toBe(false);
  });
});
