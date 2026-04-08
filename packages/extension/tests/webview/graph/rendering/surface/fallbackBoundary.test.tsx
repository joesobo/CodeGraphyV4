import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SurfaceFallbackBoundary } from '../../../../../src/webview/components/graph/rendering/surface/fallbackBoundary';

function Crash({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('boom');
  }

  return <div>graph surface</div>;
}

describe('webview/graph/rendering/surface/fallbackBoundary', () => {
  it('renders children while no surface error has occurred', () => {
    render(
      <SurfaceFallbackBoundary fallback={<div>fallback</div>} resetKey="a">
        <Crash shouldThrow={false} />
      </SurfaceFallbackBoundary>,
    );

    expect(screen.getByText('graph surface')).toBeInTheDocument();
  });

  it('renders the fallback and reports errors', () => {
    const onError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SurfaceFallbackBoundary fallback={<div>fallback</div>} onError={onError} resetKey="a">
        <Crash shouldThrow />
      </SurfaceFallbackBoundary>,
    );

    expect(screen.getByText('fallback')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));

    consoleError.mockRestore();
  });

  it('resets the boundary when the reset key changes', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <SurfaceFallbackBoundary fallback={<div>fallback</div>} resetKey="a">
        <Crash shouldThrow />
      </SurfaceFallbackBoundary>,
    );

    expect(screen.getByText('fallback')).toBeInTheDocument();

    rerender(
      <SurfaceFallbackBoundary fallback={<div>fallback</div>} resetKey="b">
        <Crash shouldThrow={false} />
      </SurfaceFallbackBoundary>,
    );

    expect(screen.getByText('graph surface')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
