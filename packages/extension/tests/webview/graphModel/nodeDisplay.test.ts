import { describe, expect, it } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/contracts';
import {
  DEFAULT_NODE_SIZE,
  FAVORITE_BORDER_COLOR,
  getDepthOpacity,
  getDepthSizeMultiplier,
  getNodeType,
  resolveDirectionColor,
} from '../../../src/webview/components/graphModel/nodeDisplay';

describe('graphModel/nodeDisplay', () => {
  it('exports the public sizing and favorite border constants', () => {
    expect(DEFAULT_NODE_SIZE).toBe(16);
    expect(FAVORITE_BORDER_COLOR).toBe('#EAB308');
  });

  it('keeps valid direction colors', () => {
    expect(resolveDirectionColor('#123ABC')).toBe('#123ABC');
  });

  it('falls back to the default direction color for invalid colors', () => {
    expect(resolveDirectionColor('blue')).toBe(DEFAULT_DIRECTION_COLOR);
  });

  it('returns lower opacity for deeper nodes', () => {
    expect(getDepthOpacity(undefined)).toBe(1);
    expect(getDepthOpacity(0)).toBe(1);
    expect(getDepthOpacity(2)).toBe(0.7);
    expect(getDepthOpacity(10)).toBe(0.4);
  });

  it('increases the size multiplier only for focused nodes', () => {
    expect(getDepthSizeMultiplier(undefined)).toBe(1);
    expect(getDepthSizeMultiplier(0)).toBe(1.3);
    expect(getDepthSizeMultiplier(2)).toBe(1);
  });

  it('returns a wildcard node type for files without a usable extension', () => {
    expect(getNodeType('README')).toBe('*');
    expect(getNodeType('folder/file.')).toBe('*');
  });

  it('normalizes node types to lower-case extensions', () => {
    expect(getNodeType('Folder/App.TSX')).toBe('.tsx');
  });
});
