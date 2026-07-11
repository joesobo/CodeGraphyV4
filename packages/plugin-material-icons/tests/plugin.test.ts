import { describe, expect, it } from 'vitest';
import { createMaterialIconsPlugin } from '../src/plugin';

describe('Material Icons plugin', () => {
  it('contributes graph-aware icon groups through the public Graph View API', () => {
    const plugin = createMaterialIconsPlugin();
    const contribution = plugin.graphView?.defaultGroups?.[0];
    const groups = contribution?.createGroups({
      visibleGraph: {
        nodes: [{ id: 'package.json', label: 'package.json', color: '#000000' }],
        edges: [],
      },
      includeFolderMatches: false,
    });

    expect(plugin.id).toBe('codegraphy.material-icons');
    expect(groups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'default:fileName:package.json',
        pattern: 'package.json',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
      }),
    ]));
  });
});
