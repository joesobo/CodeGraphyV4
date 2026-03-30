import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@radix-ui/react-scroll-area', async () => {
  const React = await import('react');

  const Root = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => (
      <div ref={ref} data-slot="root" {...props}>
        {children}
      </div>
    ),
  );
  Root.displayName = 'Root';

  const Viewport = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => (
      <div ref={ref} data-radix-scroll-area-viewport="" {...props}>
        {children}
      </div>
    ),
  );
  Viewport.displayName = 'Viewport';

  const ScrollAreaScrollbar = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }
  >(({ children, orientation, ...props }, ref) => (
    <div ref={ref} data-orientation={orientation} {...props}>
      {children}
    </div>
  ));
  ScrollAreaScrollbar.displayName = 'ScrollAreaScrollbar';

  const ScrollAreaThumb = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => (
      <div ref={ref} data-radix-scroll-area-thumb="" {...props}>
        {children}
      </div>
    ),
  );
  ScrollAreaThumb.displayName = 'ScrollAreaThumb';

  const Corner = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
    <div ref={ref} data-slot="corner" {...props} />
  ));
  Corner.displayName = 'Corner';

  return {
    Root,
    Viewport,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    Corner,
  };
});

import { ScrollArea, ScrollBar } from '../../../../src/webview/components/ui/scroll-area';

describe('ScrollArea', () => {
  it('renders the root, viewport, default vertical scrollbar, and children', () => {
    const { container } = render(
      <ScrollArea className="custom-root">
        <div>Scrollable content</div>
      </ScrollArea>,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('relative', 'overflow-hidden', 'custom-root');
    expect(screen.getByText('Scrollable content')).toBeInTheDocument();

    const viewport = root.querySelector('[data-radix-scroll-area-viewport]');
    expect(viewport).not.toBeNull();
    expect(viewport).toHaveClass('h-full', 'w-full', 'rounded-[inherit]');

    const scrollbar = root.querySelector('[data-orientation="vertical"]');
    expect(scrollbar).not.toBeNull();
    expect(scrollbar).toHaveClass(
      'flex',
      'touch-none',
      'select-none',
      'transition-colors',
      'h-full',
      'w-2.5',
      'border-l',
      'border-l-transparent',
      'p-[1px]',
    );

    const thumb = scrollbar?.querySelector('[data-radix-scroll-area-thumb]');
    expect(thumb).not.toBeNull();
    expect(thumb).toHaveClass('relative', 'flex-1', 'rounded-full', 'bg-border');
  });
});

describe('ScrollBar', () => {
  it('renders the horizontal orientation classes when requested', () => {
    render(<ScrollBar orientation="horizontal" data-testid="scrollbar" className="custom-scrollbar" />);

    const scrollbar = screen.getByTestId('scrollbar');
    expect(scrollbar).toHaveAttribute('data-orientation', 'horizontal');
    expect(scrollbar).toHaveClass(
      'flex',
      'touch-none',
      'select-none',
      'transition-colors',
      'h-2.5',
      'flex-col',
      'border-t',
      'border-t-transparent',
      'p-[1px]',
      'custom-scrollbar',
    );
  });
});
