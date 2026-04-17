import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TooltipHeader,
  Row,
  TooltipExtraSections,
  TooltipStats,
} from '../../../src/webview/components/nodeTooltip/content';

describe('nodeTooltipContent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-08T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders optional tooltip stats rows when values are present', () => {
    render(
      <TooltipStats
        outgoingCount={3}
        incomingCount={2}
        size={1536}
        lastModified={Date.parse('2026-01-08T11:55:00Z')}
        visits={4}
        plugin="typescript"
      />,
    );

    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.getByText('3 out · 2 in')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('1.5 KB')).toBeInTheDocument();
    expect(screen.getByText('Modified')).toBeInTheDocument();
    expect(screen.getByText('5m ago')).toBeInTheDocument();
    expect(screen.getByText('Visits')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Plugin')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('omits optional tooltip stats rows when values are absent', () => {
    render(
      <TooltipStats
        outgoingCount={0}
        incomingCount={0}
      />,
    );

    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.queryByText('Size')).not.toBeInTheDocument();
    expect(screen.queryByText('Modified')).not.toBeInTheDocument();
    expect(screen.queryByText('Visits')).not.toBeInTheDocument();
    expect(screen.queryByText('Plugin')).not.toBeInTheDocument();
  });

  it('renders extra sections and actions and runs the action handler', () => {
    const action = vi.fn();

    render(
      <TooltipExtraSections
        sections={[
          { title: 'Owner', content: 'Graph Team' },
          { title: 'Notes', content: 'Keep this focused' },
        ]}
        actions={[
          { id: 'open', label: 'Open', action },
        ]}
      />,
    );

    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Graph Team')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Keep this focused')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(action).toHaveBeenCalledOnce();
  });

  it('renders a section list without an action wrapper when there are no actions', () => {
    const { container } = render(
      <TooltipExtraSections
        sections={[
          { title: 'Owner', content: 'Graph Team' },
        ]}
      />,
    );

    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Graph Team')).toBeInTheDocument();
    expect(container.querySelector('.flex.flex-wrap.gap-1.pt-1.pointer-events-auto')).toBeNull();
  });

  it('renders an action wrapper when there are actions and no sections', () => {
    const action = vi.fn();
    const { container } = render(
      <TooltipExtraSections
        actions={[
          { id: 'open', label: 'Open', action },
        ]}
        sections={[]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
    expect(container.querySelector('.flex.flex-wrap.gap-1.pt-1.pointer-events-auto')).toBeInTheDocument();
  });

  it('renders nothing when there are no extra sections or actions', () => {
    const { container } = render(<TooltipExtraSections sections={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a row label and value', () => {
    render(<Row label="Kind" value="Import" />);

    expect(screen.getByText('Kind')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('renders the tooltip header path', () => {
    render(<TooltipHeader path="src/App.ts" />);

    expect(screen.getByText('src/App.ts')).toBeInTheDocument();
  });
});
