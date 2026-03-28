/**
 * Tests targeting surviving CSS class and style mutations in NodeTooltip.tsx.
 * Specifically: StringLiteral "" on CSS class strings, ObjectLiteral {} on styles,
 * and ArrayDeclaration [] on extraSections default.
 */
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

describe('NodeTooltip (CSS class mutations)', () => {
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

  it('applies rounded-md class to the tooltip wrapper', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={1}
        outgoingCount={2}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('rounded-md');
  });

  it('applies border class to the tooltip wrapper', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={1}
        outgoingCount={2}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('border');
  });

  it('applies shadow-md class to the tooltip wrapper', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={1}
        outgoingCount={2}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('shadow-md');
  });

  it('applies pointer-events-none class to the tooltip wrapper', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={1}
        outgoingCount={2}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('pointer-events-none');
  });

  it('applies VS Code hover widget background class', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={1}
        outgoingCount={2}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('editorHoverWidget-background');
  });

  it('applies VS Code hover widget border class', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={1}
        outgoingCount={2}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('editorHoverWidget-border');
  });

  it('applies VS Code hover widget foreground class', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={1}
        outgoingCount={2}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('editorHoverWidget-foreground');
  });

  it('sets zIndex 1000 on the tooltip style', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={1}
        outgoingCount={2}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.zIndex).toBe('1000');
  });

  it('sets maxWidth 280 on the tooltip style', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={1}
        outgoingCount={2}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.maxWidth).toBe('280px');
  });

  it('merges floating styles into the tooltip element', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={1}
        outgoingCount={2}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    // floatingStyles has position: absolute, left: 24px, top: 12px
    expect(wrapper.style.position).toBe('absolute');
  });

  it('renders the separator between header and stats', () => {
    const { container } = render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={1}
        outgoingCount={2}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    // Separator renders as a div with role="none" or a div element
    const separators = container.querySelectorAll('[data-orientation]');
    expect(separators.length).toBeGreaterThanOrEqual(1);
  });

  it('renders TooltipHeader with the path', () => {
    render(
      <NodeTooltip
        path="src/components/App.ts"
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    expect(screen.getByText('src/components/App.ts')).toBeInTheDocument();
  });

  it('renders connections even when counts are zero', () => {
    render(
      <NodeTooltip
        path="src/App.ts"
        incomingCount={0}
        outgoingCount={0}
        nodeRect={defaultNodeRect}
        visible={true}
      />,
    );
    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.getByText('0 out \u00B7 0 in')).toBeInTheDocument();
  });
});
