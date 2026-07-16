import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OwnedGraphMinimap } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/presentation';

describe('Relationship Graph minimap presentation', () => {
  it('retains a square bordered bottom-left secondary surface', () => {
    const canvasRef = createRef<HTMLCanvasElement>();
    const overlayRef = createRef<SVGSVGElement>();
    const panelRef = createRef<HTMLDivElement>();

    render(<OwnedGraphMinimap
      canvasRef={canvasRef}
      overlayRef={overlayRef}
      panelRef={panelRef}
    />);

    const panel = screen.getByLabelText('Relationship Graph minimap');
    expect(panel).toHaveClass('bottom-3', 'left-3', 'h-40', 'w-40', 'border');
    expect(canvasRef.current).toHaveClass('absolute', 'inset-0', 'h-full', 'w-full');
    expect(overlayRef.current).toHaveAttribute('viewBox', '0 0 160 160');
  });
});
