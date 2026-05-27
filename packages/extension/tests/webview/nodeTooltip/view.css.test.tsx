/**
 * Tests targeting surviving CSS class and style mutations in NodeTooltip.tsx.
 * Specifically: StringLiteral "" on CSS class strings, ObjectLiteral {} on styles,
 * and ArrayDeclaration [] on extraSections default.
 */
import { render } from '@testing-library/react';
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

import { NodeTooltip } from '../../../src/webview/components/nodeTooltip/view';

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



    it('applies themed popover background class', () => {
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
      expect(wrapper.className).toContain('bg-popover');
    });



    it('applies themed popover border class', () => {
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
      expect(wrapper.className).toContain('border-border');
    });



    it('applies themed popover foreground class', () => {
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
      expect(wrapper.className).toContain('text-popover-foreground');
    });
});
