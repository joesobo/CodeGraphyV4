import { describe, expect, it } from 'vitest';
import { buildNativeNodeDecorations } from '../../../src/extension/nativeDecorations/model';

describe('nativeDecorations/model', () => {
  it('combines a Git ring with a problems badge for the same file', () => {
    expect(buildNativeNodeDecorations(
      new Map([['/workspace/src/app.ts', 'modified']]),
      new Map([['/workspace/src/app.ts', { errors: 1, warnings: 2 }]]),
    )).toEqual({
      '/workspace/src/app.ts': {
        border: { color: '#e2c08d', width: 2, style: 'solid' },
        badge: {
          text: '3',
          color: '#ffffff',
          bgColor: '#f14c4c',
          position: 'bottom-right',
          tooltip: '1 error, 2 warnings',
        },
        tooltip: {
          sections: [
            { title: 'Source Control', content: 'Modified' },
            { title: 'Problems', content: '1 error, 2 warnings' },
          ],
        },
      },
    });
  });
});
