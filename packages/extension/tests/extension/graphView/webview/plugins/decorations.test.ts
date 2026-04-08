import { describe, expect, it } from 'vitest';
import { buildGraphViewDecorationPayload } from '../../../../../src/extension/graphView/webview/plugins/decorations';

describe('graphView/webview/plugins/decorations', () => {
  it('strips priority fields while preserving merged decoration payloads', () => {
    const payload = buildGraphViewDecorationPayload(
      new Map([
        [
          'src/app.ts',
          {
            color: '#ffffff',
            priority: 10,
            label: { text: 'App' },
          },
        ],
      ]),
      new Map([
        [
          'src/app.ts->src/lib.ts',
          {
            color: '#000000',
            priority: 5,
            width: 2,
          },
        ],
      ]),
    );

    expect(payload).toEqual({
      nodeDecorations: {
        'src/app.ts': {
          color: '#ffffff',
          label: { text: 'App' },
        },
      },
      edgeDecorations: {
        'src/app.ts->src/lib.ts': {
          color: '#000000',
          width: 2,
        },
      },
    });
  });
});
