import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SectionFrames } from '../../../../src/webview/components/graph/sectionFrames/view';
import type { GraphLayoutOwnership, GraphLayoutSection } from '../../../../src/shared/settings/graphLayout';

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
      pinnedSectionIds={new Set(['section-1'])}
      onUpdateSection={onUpdateSection}
    />,
  );

  return { onUpdateSection };
}

function renderSectionFramesWithLiveNodePosition() {
  const onUpdateSection = vi.fn();
  const nodePosition = {
    id: 'section-1',
    sectionHeight: 210,
    sectionWidth: 320,
    x: 25,
    y: 40,
  };
  render(
    <SectionFrames
      graph={{
        graph2ScreenCoords: (x, y) => ({ x: x + 200, y: y + 150 }),
        screen2GraphCoords: (x, y) => ({ x: x - 200, y: y - 150 }),
      }}
      sectionNodePositions={new Map([[
        'section-1',
        nodePosition,
      ]])}
      sections={[section]}
      onUpdateSection={onUpdateSection}
    />,
  );

  return { nodePosition, onUpdateSection };
}

function renderNestedSectionFrames({
  parentCollapsed = false,
}: { parentCollapsed?: boolean } = {}) {
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
      updatedAt: '2026-05-07T09:01:00.000Z',
    },
  };
  render(
    <SectionFrames
      ownership={ownership}
      sections={[
        {
          ...section,
          id: 'section-2',
          label: 'Child',
          x: 20,
          y: 20,
          width: 80,
          height: 80,
        },
        {
          ...section,
          collapsed: parentCollapsed,
        },
      ]}
      onUpdateSection={vi.fn()}
    />,
  );
}

describe('graph/sectionFrames/view', () => {
  it('renders expanded Section Frames in screen coordinates with editable label and color controls', () => {
    renderSectionFrames();

    const frame = screen.getByTestId('graph-section-frame-section-1');
    const dragHandle = screen.getByTestId('graph-section-drag-handle-section-1');
    expect(frame).toHaveStyle({
      left: '60px',
      top: '60px',
      width: '280px',
      height: '180px',
      borderColor: '#60a5fa',
    });
    expect(frame).toHaveClass('pointer-events-none');
    expect(dragHandle).toHaveClass('pointer-events-auto');
    expect(dragHandle).toHaveStyle({
      backgroundColor: '#60a5fa22',
      borderColor: '#60a5fa',
    });
    expect(screen.getByTestId('graph-section-resize-section-1')).toHaveClass('pointer-events-auto');
    expect(screen.getByTestId('graph-section-resize-section-1')).toHaveStyle({
      borderColor: '#60a5fa',
    });
    expect(screen.getByLabelText('Graph Section label')).toHaveValue('Section 1');
    expect(screen.getByLabelText('Graph Section color')).toHaveValue('#60a5fa');
  });

  it('anchors editable Section Frames to the live force node position', () => {
    renderSectionFramesWithLiveNodePosition();

    expect(screen.getByTestId('graph-section-frame-section-1')).toHaveStyle({
      left: '225px',
      top: '190px',
      width: '320px',
      height: '210px',
    });
  });

  it('posts label and color updates from the frame controls', () => {
    const { onUpdateSection } = renderSectionFrames();

    fireEvent.change(screen.getByLabelText('Graph Section label'), { target: { value: 'UI Work' } });
    fireEvent.change(screen.getByLabelText('Graph Section color'), { target: { value: '#22c55e' } });

    expect(onUpdateSection).toHaveBeenCalledWith('section-1', { label: 'UI Work' });
    expect(onUpdateSection).toHaveBeenCalledWith('section-1', { color: '#22c55e' });
  });

  it('collapses a Section Frame from the header and marks pinned sections', () => {
    const { onUpdateSection } = renderSectionFrames();

    expect(screen.getByLabelText('Pinned Graph Section')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Collapse Graph Section'));

    expect(onUpdateSection).toHaveBeenCalledWith('section-1', { collapsed: true });
  });

  it('moves a Section Frame by graph-space drag delta', () => {
    const { onUpdateSection } = renderSectionFrames();
    const dragHandle = screen.getByTestId('graph-section-drag-handle-section-1');

    act(() => {
      fireEvent.mouseDown(dragHandle, { button: 0, clientX: 60, clientY: 60 });
      fireEvent.mouseMove(window, { clientX: 100, clientY: 90 });
      fireEvent.mouseUp(window, { clientX: 100, clientY: 90 });
    });

    expect(onUpdateSection).toHaveBeenCalledWith('section-1', {
      x: -100,
      y: -60,
    });

    fireEvent.mouseUp(window, { clientX: 140, clientY: 120 });

    expect(onUpdateSection).toHaveBeenCalledTimes(1);
  });

  it('moves a live-positioned Section Frame from the live graph-space coordinates', () => {
    const { nodePosition, onUpdateSection } = renderSectionFramesWithLiveNodePosition();
    const dragHandle = screen.getByTestId('graph-section-drag-handle-section-1');
    nodePosition.x = 50;
    nodePosition.y = 60;

    act(() => {
      fireEvent.mouseDown(dragHandle, { button: 0, clientX: 250, clientY: 210 });
      fireEvent.mouseMove(window, { clientX: 290, clientY: 240 });
      fireEvent.mouseUp(window, { clientX: 290, clientY: 240 });
    });

    expect(onUpdateSection).toHaveBeenCalledWith('section-1', {
      x: 90,
      y: 90,
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

  it('does not start a move drag from Section Frame controls or non-primary mouse buttons', () => {
    const { onUpdateSection } = renderSectionFrames();
    const frame = screen.getByTestId('graph-section-frame-section-1');

    act(() => {
      fireEvent.mouseDown(screen.getByLabelText('Graph Section label'), { button: 0, clientX: 60, clientY: 60 });
      fireEvent.mouseUp(window, { clientX: 100, clientY: 90 });
      fireEvent.mouseDown(frame, { button: 2, clientX: 60, clientY: 60 });
      fireEvent.mouseUp(window, { clientX: 100, clientY: 90 });
    });

    expect(onUpdateSection).not.toHaveBeenCalled();
  });

  it('renders parent frames before child frames so nested children stay interactive', () => {
    renderNestedSectionFrames();

    expect(screen.getAllByTestId(/graph-section-frame-/).map(frame => frame.dataset.testid)).toEqual([
      'graph-section-frame-section-1',
      'graph-section-frame-section-2',
    ]);
  });

  it('hides descendant frames while an ancestor Graph Section is collapsed', () => {
    renderNestedSectionFrames({ parentCollapsed: true });

    expect(screen.queryByTestId('graph-section-frame-section-1')).toBeNull();
    expect(screen.queryByTestId('graph-section-frame-section-2')).toBeNull();
  });

  it('renders no frame container when there are no visible Section Frames', () => {
    render(
      <SectionFrames
        sections={[]}
        onUpdateSection={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('graph-section-frames')).toBeNull();
  });
});
