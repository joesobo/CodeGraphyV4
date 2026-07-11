import { describe, expect, it } from 'vitest';
import { mergeNodeDecorationMaps } from '../../../src/webview/nativeDecorations/model';

describe('webview/nativeDecorations/model', () => {
  it('adds native decorations without removing plugin decoration fields', () => {
    expect(mergeNodeDecorationMaps(
      {
        'src/app.ts': {
          color: '#123456',
          tooltip: { sections: [{ title: 'Plugin', content: 'Owned by plugin' }] },
        },
      },
      {
        'src/app.ts': {
          badge: { text: 'E 2', bgColor: '#F14C4C' },
          border: { color: '#E2C08D', width: 2 },
          tooltip: { sections: [{ title: 'Problems', content: '2 errors' }] },
        },
      },
    )).toEqual({
      'src/app.ts': {
        color: '#123456',
        badge: { text: 'E 2', bgColor: '#F14C4C' },
        border: { color: '#E2C08D', width: 2 },
        tooltip: {
          sections: [
            { title: 'Problems', content: '2 errors' },
            { title: 'Plugin', content: 'Owned by plugin' },
          ],
        },
      },
    });
  });

  it('retains nodes decorated by only one source', () => {
    expect(Object.keys(mergeNodeDecorationMaps(
      { 'src/plugin.ts': { color: '#123456' } },
      { 'src/native.ts': { border: { color: '#E2C08D' } } },
    ))).toEqual(['src/plugin.ts', 'src/native.ts']);
  });
});
