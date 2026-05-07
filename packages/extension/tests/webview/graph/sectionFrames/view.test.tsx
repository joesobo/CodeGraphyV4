import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SectionFrames } from '../../../../src/webview/components/graph/sectionFrames/view';
import type { GraphLayoutSection } from '../../../../src/shared/settings/graphLayout';

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

function renderSectionFrames(overrides: Partial<GraphLayoutSection> = {}) {
  const onUpdateSection = vi.fn();
  render(
    <SectionFrames
      graph={{
        graph2ScreenCoords: (x, y) => ({ x: x + 200, y: y + 150 }),
        screen2GraphCoords: (x, y) => ({ x: x - 200, y: y - 150 }),
      }}
      sections={[{ ...section, ...overrides }]}
      onUpdateSection={onUpdateSection}
    />,
  );

  return { onUpdateSection };
}

describe('graph/sectionFrames/view', () => {
  it('renders expanded Section Frames in screen coordinates with editable label and color controls', () => {
    renderSectionFrames();

    const frame = screen.getByTestId('graph-section-frame-section-1');
    expect(frame).toHaveStyle({
      left: '60px',
      top: '60px',
      width: '280px',
      height: '180px',
    });
    expect(screen.getByLabelText('Graph Section label')).toHaveValue('Section 1');
    expect(screen.getByLabelText('Graph Section color')).toHaveValue('#60a5fa');
  });

  it('posts label and color updates from the frame controls', () => {
    const { onUpdateSection } = renderSectionFrames();

    fireEvent.change(screen.getByLabelText('Graph Section label'), { target: { value: 'UI Work' } });
    fireEvent.change(screen.getByLabelText('Graph Section color'), { target: { value: '#22c55e' } });

    expect(onUpdateSection).toHaveBeenCalledWith('section-1', { label: 'UI Work' });
    expect(onUpdateSection).toHaveBeenCalledWith('section-1', { color: '#22c55e' });
  });

  it('moves a Section Frame by graph-space drag delta', () => {
    const { onUpdateSection } = renderSectionFrames();
    const frame = screen.getByTestId('graph-section-frame-section-1');

    act(() => {
      fireEvent.mouseDown(frame, { button: 0, clientX: 60, clientY: 60 });
      fireEvent.mouseMove(window, { clientX: 100, clientY: 90 });
      fireEvent.mouseUp(window, { clientX: 100, clientY: 90 });
    });

    expect(onUpdateSection).toHaveBeenCalledWith('section-1', {
      x: -100,
      y: -60,
    });
  });

  it('resizes a Section Frame from its southeast handle', () => {
    const { onUpdateSection } = renderSectionFrames();

    act(() => {
      fireEvent.mouseDown(screen.getByTestId('graph-section-resize-section-1'), { button: 0, clientX: 340, clientY: 240 });
      fireEvent.mouseMove(window, { clientX: 380, clientY: 270 });
      fireEvent.mouseUp(window, { clientX: 380, clientY: 270 });
    });

    expect(onUpdateSection).toHaveBeenCalledWith('section-1', {
      height: 210,
      width: 320,
    });
  });
});
