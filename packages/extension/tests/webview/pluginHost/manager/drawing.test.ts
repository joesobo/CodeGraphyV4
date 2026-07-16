import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebviewPluginHost } from '../../../../src/webview/pluginHost/manager';
import { createMockContext } from './fixture';

describe('WebviewPluginHost drawing helpers',()=>{
  beforeEach(()=>{ document.body.innerHTML=''; });
  afterEach(()=>vi.restoreAllMocks());

  it('draws badges with default colors and centered text', () => {
      const ctx = createMockContext();
  
      WebviewPluginHost.drawBadge(ctx, { x: 10, y: 20, text: '3' });
  
      expect(ctx.font).toBe('bold 8px sans-serif');
      expect(ctx.fillStyle).toBe('#FFFFFF');
      expect(ctx.textAlign).toBe('center');
      expect(ctx.textBaseline).toBe('middle');
      expect(ctx.roundRect).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalledWith('3', 10, 20);
    });

  it('uses custom badge colors and font sizes when provided', () => {
      const ctx = createMockContext();
  
      WebviewPluginHost.drawBadge(ctx, {
        x: 10,
        y: 20,
        text: '7',
        fontSize: 12,
        bgColor: '#111111',
        color: '#eeeeee',
      });
  
      expect(ctx.font).toBe('bold 12px sans-serif');
      expect(ctx.fillStyle).toBe('#eeeeee');
      expect(ctx.roundRect).toHaveBeenCalledWith(10 - 15, 20 - 9, 30, 18, 9);
    });

  it('draws progress rings with default width and progress', () => {
      const ctx = createMockContext();
  
      WebviewPluginHost.drawProgressRing(ctx, { x: 10, y: 20, radius: 12, color: '#00ff00' });
  
      expect(ctx.lineWidth).toBe(2);
      expect(ctx.strokeStyle).toBe('#00ff00');
      expect(ctx.arc).toHaveBeenCalledWith(10, 20, 12, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * 1);
      expect(ctx.stroke).toHaveBeenCalled();
    });

  it('uses custom progress-ring width and progress values when provided', () => {
      const ctx = createMockContext();
  
      WebviewPluginHost.drawProgressRing(ctx, {
        x: 10,
        y: 20,
        radius: 12,
        color: '#00ff00',
        width: 4,
        progress: 0.25,
      });
  
      expect(ctx.lineWidth).toBe(4);
      expect(ctx.arc).toHaveBeenCalledWith(10, 20, 12, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * 0.25);
    });

  it('draws labels with default alignment and font size', () => {
      const ctx = createMockContext();
  
      WebviewPluginHost.drawLabel(ctx, { x: 8, y: 12, text: 'File.ts' });
  
      expect(ctx.font).toBe('10px sans-serif');
      expect(ctx.fillStyle).toBe('#FFFFFF');
      expect(ctx.textAlign).toBe('center');
      expect(ctx.textBaseline).toBe('middle');
      expect(ctx.fillText).toHaveBeenCalledWith('File.ts', 8, 12);
    });
});
