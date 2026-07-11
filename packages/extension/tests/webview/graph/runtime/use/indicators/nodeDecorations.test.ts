import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  applyNodeDecorationIndicators,
  useNodeDecorationIndicators,
} from '../../../../../../src/webview/components/graph/runtime/use/indicators/nodeDecorations';

describe('graph/runtime/use/indicators/nodeDecorations', () => {
  it('applies Git rings and problem badge text to existing 3d objects', () => {
    const emissiveSet = vi.fn();
    const material = { emissive: { set: emissiveSet }, emissiveIntensity: 0 };
    const sprite = { text: 'app.ts' };

    applyNodeDecorationIndicators({
      decorations: {
        'src/app.ts': {
          badge: { text: '3' },
          border: { color: '#e2c08d' },
        },
      },
      graphNodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }] as never,
      meshes: new Map([['src/app.ts', { material } as never]]),
      sprites: new Map([['src/app.ts', sprite as never]]),
    });

    expect(emissiveSet).toHaveBeenCalledWith('#e2c08d');
    expect(material.emissiveIntensity).toBe(0.9);
    expect(sprite.text).toBe('app.ts  [3]');
  });

  it('clears removed native decoration visuals', () => {
    const emissiveSet = vi.fn();
    const material = { emissive: { set: emissiveSet }, emissiveIntensity: 0.9 };
    const sprite = { text: 'app.ts  [3]' };

    applyNodeDecorationIndicators({
      decorations: {},
      graphNodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }] as never,
      meshes: new Map([['src/app.ts', { material } as never]]),
      sprites: new Map([['src/app.ts', sprite as never]]),
    });

    expect(emissiveSet).toHaveBeenCalledWith('#000000');
    expect(material.emissiveIntensity).toBe(0);
    expect(sprite.text).toBe('app.ts');
  });

  it('requests a cooled 2d canvas repaint when decorations change', () => {
    const zoom = vi.fn(() => 1);
    const options = {
      decorations: {},
      fg2dRef: { current: { zoom } },
      graphMode: '2d' as const,
      graphNodes: [],
      meshesRef: { current: new Map() },
      spritesRef: { current: new Map() },
    };
    const { rerender } = renderHook(
      ({ decorations }) => useNodeDecorationIndicators({ ...options, decorations }),
      { initialProps: { decorations: {} } },
    );
    zoom.mockClear();

    rerender({ decorations: { 'src/app.ts': { border: { color: '#e2c08d' } } } });

    expect(zoom).toHaveBeenNthCalledWith(1);
    expect(zoom).toHaveBeenNthCalledWith(2, 1, 0);
  });
});
