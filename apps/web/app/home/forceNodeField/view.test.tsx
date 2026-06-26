import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ForceNodeControls } from './controls';
import { ForceNodeSettingsProvider } from './settings';
import { ForceNodeField } from './view';

function installDesktopMatchMedia(): () => void {
  const originalMatchMedia = window.matchMedia;
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      addEventListener,
      addListener: addEventListener,
      dispatchEvent: vi.fn(),
      matches: query.includes('min-width') || query.includes('pointer: fine'),
      media: query,
      onchange: null,
      removeEventListener,
      removeListener: removeEventListener,
    }),
  });

  return () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  };
}

function installWideCoarsePointerMatchMedia(): () => void {
  const originalMatchMedia = window.matchMedia;
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      addEventListener,
      addListener: addEventListener,
      dispatchEvent: vi.fn(),
      matches: query.includes('min-width') && !query.includes('pointer: fine'),
      media: query,
      onchange: null,
      removeEventListener,
      removeListener: removeEventListener,
    }),
  });

  return () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  };
}

function firstRenderedNodeRadius(): number {
  const circle = document.querySelector<SVGCircleElement>('[data-testid="force-node-field"] > g > g > circle');

  if (circle === null) {
    throw new Error('expected a rendered force node');
  }

  return Number(circle.getAttribute('r'));
}

describe('ForceNodeField', () => {
  it('stays disabled when desktop pointer media is unavailable', () => {
    render(
      <ForceNodeSettingsProvider>
        <ForceNodeField />
      </ForceNodeSettingsProvider>,
    );

    expect(screen.queryByTestId('force-node-field')).not.toBeInTheDocument();
  });

  it('renders on wide screens even when the browser does not report a fine pointer', async () => {
    const restoreMatchMedia = installWideCoarsePointerMatchMedia();

    try {
      render(
        <ForceNodeSettingsProvider>
          <section data-force-field-section="true">
            <ForceNodeField />
          </section>
        </ForceNodeSettingsProvider>,
      );

      expect(await screen.findByTestId('force-node-field')).toBeInTheDocument();
    } finally {
      restoreMatchMedia();
    }
  });

  it('updates rendered node size from the shared hero controls', async () => {
    const restoreMatchMedia = installDesktopMatchMedia();

    try {
      render(
        <ForceNodeSettingsProvider>
          <section data-force-field-section="true">
            <ForceNodeField />
            <ForceNodeControls />
          </section>
        </ForceNodeSettingsProvider>,
      );

      await screen.findByTestId('force-node-field');
      const initialRadius = firstRenderedNodeRadius();

      fireEvent.change(screen.getByRole('slider', { name: 'Node size' }), { target: { value: '100' } });

      await waitFor(() => {
        expect(firstRenderedNodeRadius()).toBeGreaterThan(initialRadius);
      });
    } finally {
      restoreMatchMedia();
    }
  });
});
