import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const floatingHarness = vi.hoisted(() => ({
  setReference: vi.fn(),
  setFloating: vi.fn(),
  floatingStyles: { position: 'absolute', left: '24px', top: '12px' },
}));

vi.mock('@floating-ui/react', () => ({
  useFloating: vi.fn(() => ({
    refs: {
      setReference: floatingHarness.setReference,
      setFloating: floatingHarness.setFloating,
    },
    floatingStyles: floatingHarness.floatingStyles,
  })),
  offset: vi.fn((value: number) => ({ name: 'offset', options: value })),
  flip: vi.fn((value: unknown) => ({ name: 'flip', options: value })),
  shift: vi.fn((value: unknown) => ({ name: 'shift', options: value })),
  autoUpdate: vi.fn(),
}));

import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import { NodeTooltip } from '../../../src/webview/components/nodeTooltip/view';

const defaultNodeRect = { x: 120, y: 180, radius: 20 };

describe('NodeTooltip (mutation targets)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-08T12:00:00Z'));
    floatingHarness.setReference.mockClear();
    floatingHarness.setFloating.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns null when visible is false', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={1}
        outgoingCount={2}
        nodeRect={defaultNodeRect}
        visible={false}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders tooltip content when visible is true', () => {
    render(
      <NodeTooltip
        path="src/main.ts"
        incomingCount={3}
        outgoingCount={5}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    expect(screen.getByText('src/main.ts')).toBeInTheDocument();
    expect(screen.getByText('5 out \u00B7 3 in')).toBeInTheDocument();
  });

  it('defaults extraSections to empty array (no extra sections rendered)', () => {
    render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    // No extra section titles or content
    expect(screen.queryByText('Owner')).not.toBeInTheDocument();
  });

  it('renders extra sections with separator when provided', () => {
    render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
        extraSections={[{ title: 'Coverage', content: '95%' }]}
      />,
    );
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('omits Visits row when visits is 0', () => {
    render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        visits={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    expect(screen.queryByText('Visits')).not.toBeInTheDocument();
  });

  it('shows Visits row when visits is positive', () => {
    render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        visits={5}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    expect(screen.getByText('Visits')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('omits Plugin row when plugin is undefined', () => {
    render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    expect(screen.queryByText('Plugin')).not.toBeInTheDocument();
  });

  it('shows Plugin row when plugin is provided', () => {
    render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        plugin="Godot"
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    expect(screen.getByText('Plugin')).toBeInTheDocument();
    expect(screen.getByText('Godot')).toBeInTheDocument();
  });

  it('omits Size row when size is undefined', () => {
    render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    expect(screen.queryByText('Size')).not.toBeInTheDocument();
  });

  it('shows Size row when size is 0', () => {
    render(
      <NodeTooltip
        path="src/App.ts"
        size={0}
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('0 B')).toBeInTheDocument();
  });

  it('computes virtual element bounding rect from nodeRect', () => {
    render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        nodeRect={{ x: 200, y: 300, radius: 10 }}
        visible={true}
      />,
    );

    const virtualRef = floatingHarness.setReference.mock.calls[0]?.[0] as {
      getBoundingClientRect: () => DOMRect;
    };
    const rect = virtualRef.getBoundingClientRect();
    expect(rect.x).toBe(190);
    expect(rect.y).toBe(290);
    expect(rect.width).toBe(20);
    expect(rect.height).toBe(20);
    expect(rect.top).toBe(290);
    expect(rect.left).toBe(190);
    expect(rect.right).toBe(210);
    expect(rect.bottom).toBe(310);
  });

  it('configures floating-ui with the expected placement, middleware, and auto update hook', () => {
    render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={2}
        outgoingCount={4}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );

    expect(offset).toHaveBeenCalledWith(8);
    expect(flip).toHaveBeenCalledWith({ fallbackPlacements: ['left-start', 'right-end', 'left-end'] });
    expect(shift).toHaveBeenCalledWith({ padding: 8 });

    const config = vi.mocked(useFloating).mock.calls.at(-1)?.[0];
    expect(config).toMatchObject({
      open: true,
      placement: 'right-start',
      whileElementsMounted: autoUpdate,
    });
    expect(config?.middleware).toEqual([
      { name: 'offset', options: 8 },
      { name: 'flip', options: { fallbackPlacements: ['left-start', 'right-end', 'left-end'] } },
      { name: 'shift', options: { padding: 8 } },
    ]);
  });

  it('updates the floating reference when the node rect changes', () => {
    const { rerender } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );

    const firstReference = floatingHarness.setReference.mock.calls.at(-1)?.[0] as {
      getBoundingClientRect: () => DOMRect;
    };

    rerender(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        nodeRect={{ x: 40, y: 60, radius: 5 }}
        visible={true}
      />,
    );

    const secondReference = floatingHarness.setReference.mock.calls.at(-1)?.[0] as {
      getBoundingClientRect: () => DOMRect;
    };

    expect(secondReference).not.toBe(firstReference);
    expect(secondReference.getBoundingClientRect()).toMatchObject({
      x: 35,
      y: 55,
      width: 10,
      height: 10,
      top: 55,
      left: 35,
      right: 45,
      bottom: 65,
    });
  });

  it('renders only the base separator when extra sections are omitted', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );

    expect(container.querySelectorAll('[data-orientation="horizontal"]')).toHaveLength(1);
  });
});
