import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  OwnedGraphMinimap,
  updateOwnedGraphMinimapOverlay,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/presentation';

describe('Relationship Graph minimap presentation', () => {
  it('retains a square bordered bottom-left secondary surface', () => {
    const canvasRef = createRef<HTMLCanvasElement>();
    const overlayRef = createRef<SVGSVGElement>();
    const panelRef = createRef<HTMLDivElement>();
    const viewportBoxRef = createRef<SVGRectElement>();
    const directionIndicatorRef = createRef<SVGPathElement>();

    render(<OwnedGraphMinimap
      canvasRef={canvasRef}
      enabled
      overlayRef={overlayRef}
      panelRef={panelRef}
      viewportBoxRef={viewportBoxRef}
      directionIndicatorRef={directionIndicatorRef}
    />);

    const panel = screen.getByLabelText('Relationship Graph minimap');
    expect(panel).toHaveClass('bottom-3', 'h-40', 'w-40', 'border');
    expect(panel).toHaveStyle({ left: '12px' });
    expect(canvasRef.current).toHaveClass('absolute', 'inset-0', 'h-full', 'w-full');
    expect(overlayRef.current).toHaveAttribute('viewBox', '0 0 160 160');

    updateOwnedGraphMinimapOverlay(viewportBoxRef.current!, directionIndicatorRef.current!, {
      box: { height: 40, width: 50, x: 65, y: 40 },
      indicator: null,
    });
    expect(viewportBoxRef.current).toHaveAttribute('x', '65');
    expect(viewportBoxRef.current).toHaveAttribute('width', '50');
    expect(viewportBoxRef.current).not.toHaveAttribute('display', 'none');
    expect(directionIndicatorRef.current).toHaveAttribute('display', 'none');
  });
});
