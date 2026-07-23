// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TLComponents } from 'tldraw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updatePage: vi.fn(),
}));

vi.mock('tldraw', () => ({
  useEditor: () => ({
    getCurrentPage: () => ({
      id: 'page:page',
      meta: {},
    }),
    updatePage: mocks.updatePage,
  }),
  useValue: (_name: string, read: () => unknown) => read(),
}));

import createCodeGraphyConfig from '../../../src/documentRuntime/forceControls/view';

function configuredCanvasUi(existing?: TLComponents['InFrontOfTheCanvas']) {
  const configured = createCodeGraphyConfig({
    config: { components: { InFrontOfTheCanvas: existing } },
  });
  const CanvasUi = configured.components?.InFrontOfTheCanvas;
  if (!CanvasUi) throw new Error('The force panel canvas UI was not configured');
  return CanvasUi;
}

describe('CodeGraphy tldraw force controls view', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the four force sliders with their initial values', () => {
    render(createElement(configuredCanvasUi()));

    expect(screen.getAllByRole('slider')).toHaveLength(4);
    expect(screen.getByRole<HTMLInputElement>('slider', { name: 'Repel Force' }).value).toBe('10');
    expect(screen.getByRole<HTMLInputElement>('slider', { name: 'Center Force' }).value).toBe('0.1');
    expect(screen.getByRole<HTMLInputElement>('slider', { name: 'Link Distance' }).value).toBe('80');
    expect(screen.getByRole<HTMLInputElement>('slider', { name: 'Link Force' }).value).toBe('1');
  });

  it('places transparent controls on the left using tldraw theme colors', () => {
    render(createElement(configuredCanvasUi()));

    const panel = screen.getByRole('region', { name: 'CodeGraphy forces' });
    expect(panel.style.background).toBe('');
    expect(panel.style.boxShadow).toBe('');
    expect(panel.style.left).toBe('12px');
    expect(panel.style.right).toBe('');
    expect(panel.style.top).toBe('104px');
    expect(panel.style.color).toBe('var(--tl-color-text-1)');
    expect(screen.getByRole('slider', { name: 'Repel Force' }).style.accentColor)
      .toBe('var(--tl-color-selected)');
  });

  it('uses the compact link distance range', () => {
    render(createElement(configuredCanvasUi()));

    const linkDistance = screen.getByRole<HTMLInputElement>('slider', { name: 'Link Distance' });
    expect(linkDistance.min).toBe('5');
    expect(linkDistance.max).toBe('100');
    expect(linkDistance.step).toBe('5');
  });

  it('retains the existing in-front-of-canvas component', () => {
    const ExistingCanvasUi = () => createElement('div', null, 'Existing canvas UI');
    render(createElement(configuredCanvasUi(ExistingCanvasUi)));

    expect(screen.getByText('Existing canvas UI')).toBeTruthy();
  });

  it('persists a slider change in the current tldraw page', () => {
    render(createElement(configuredCanvasUi()));

    fireEvent.change(screen.getByRole('slider', { name: 'Repel Force' }), {
      target: { value: '5' },
    });

    expect(mocks.updatePage).toHaveBeenCalledWith({
      id: 'page:page',
      meta: {
        codegraphyPhysics: {
          repelForce: 5,
          centerForce: 0.1,
          linkDistance: 80,
          linkForce: 1,
        },
      },
    });
  });
});
