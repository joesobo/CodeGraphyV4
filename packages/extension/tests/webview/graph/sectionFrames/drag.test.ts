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
