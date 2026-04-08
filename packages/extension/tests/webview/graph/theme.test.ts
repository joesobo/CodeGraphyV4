import { describe, expect, it } from 'vitest';
import { getGraphSurfaceColors } from '../../../src/webview/components/graph/theme';

describe('webview/graph/theme', () => {
  it('returns the dark graph colors by default', () => {
    expect(getGraphSurfaceColors('dark')).toEqual({
      backgroundColor: '#18181b',
      borderColor: 'rgb(63, 63, 70)',
    });
  });

  it('returns the light graph colors for light theme', () => {
    expect(getGraphSurfaceColors('light')).toEqual({
      backgroundColor: '#f5f5f5',
      borderColor: '#d4d4d4',
    });
  });
});
