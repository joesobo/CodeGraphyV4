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

import { NodeTooltip } from '../../src/webview/components/NodeTooltip';

const defaultNodeRect = { x: 120, y: 180, radius: 20 };

describe('NodeTooltip', () => {
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

  it('renders nothing when the tooltip is hidden', () => {
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

  it('renders the file path, connection counts, visits, and plugin metadata', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={1}
        outgoingCount={2}
        plugin="TypeScript"
        visits={3}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );

    expect(screen.getByText('src/App.ts')).toBeInTheDocument();
    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.getByText('2 out · 1 in')).toBeInTheDocument();
    expect(screen.getByText('Visits')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Plugin')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveStyle({ zIndex: '1000', maxWidth: '280px' });
    expect(container.firstElementChild).toHaveClass(
      'rounded-md',
      'border',
      'shadow-md',
      'pointer-events-none',
    );
  });

  it('omits optional rows when visits, plugin, size, and modified time are absent', () => {
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
    expect(screen.queryByText('Plugin')).not.toBeInTheDocument();
    expect(screen.queryByText('Size')).not.toBeInTheDocument();
    expect(screen.queryByText('Modified')).not.toBeInTheDocument();
    expect(screen.queryByText('Stryker was here')).not.toBeInTheDocument();
  });

  it.each([
    [512, '512 B'],
    [2048, '2.0 KB'],
    [3 * 1024 * 1024, '3.0 MB'],
  ])('formats %i bytes as %s', (size, expected) => {
    render(
      <NodeTooltip
        path="src/App.ts"
        size={size}
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    [1024, '1.0 KB'],
    [1024 * 1024, '1.0 MB'],
  ])('switches size units at the %i-byte boundary', (size, expected) => {
    render(
      <NodeTooltip
        path="src/App.ts"
        size={size}
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    [30_000, 'just now'],
    [5 * 60_000, '5m ago'],
    [3 * 3_600_000, '3h ago'],
    [2 * 86_400_000, '2d ago'],
  ])('formats recent modification times as %s', (elapsedMs, expected) => {
    render(
      <NodeTooltip
        path="src/App.ts"
        lastModified={Date.now() - elapsedMs}
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    [60_000, '1m ago'],
    [60 * 60_000, '1h ago'],
    [24 * 3_600_000, '1d ago'],
  ])('switches relative time units at the %i-ms boundary', (elapsedMs, expected) => {
    render(
      <NodeTooltip
        path="src/App.ts"
        lastModified={Date.now() - elapsedMs}
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('formats older modification times with the locale date string', () => {
    const dateSpy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('1/1/2024');

    render(
      <NodeTooltip
        path="src/App.ts"
        lastModified={Date.now() - 10 * 86_400_000}
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );

    expect(screen.getByText('1/1/2024')).toBeInTheDocument();
    expect(dateSpy).toHaveBeenCalled();
  });

  it('uses the node rect to build the floating virtual reference', () => {
    render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );

    const virtualReference = floatingHarness.setReference.mock.calls[0]?.[0] as {
      getBoundingClientRect: () => DOMRect;
    };

    expect(virtualReference).toBeDefined();
    expect(virtualReference.getBoundingClientRect()).toMatchObject({
      x: 100,
      y: 160,
      width: 40,
      height: 40,
      top: 160,
      left: 100,
      right: 140,
      bottom: 200,
    });
  });

  it('renders extra plugin-contributed sections', () => {
    render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
        extraSections={[
          { title: 'Owner', content: 'Team Graph' },
          { title: 'Health', content: 'Stable' },
        ]}
      />,
    );

    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Team Graph')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Stable')).toBeInTheDocument();
  });
});
