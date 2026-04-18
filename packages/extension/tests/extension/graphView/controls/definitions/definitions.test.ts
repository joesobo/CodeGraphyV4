import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeEdgeTypes, mergeNodeTypes } from '../../../../../src/extension/graphView/controls/send/definitions/merge';
import { normalizeHexColor } from '../../../../../src/shared/fileColors';
import { prettifyIdentifier } from '../../../../../src/extension/graphView/controls/send/definitions/identifiers';

vi.mock('../../../../../src/shared/fileColors', async () => {
  const actual = await vi.importActual('../../../../../src/shared/fileColors');
  return {
    ...actual,
    normalizeHexColor: vi.fn(),
  };
});

vi.mock('../../../../../src/extension/graphView/controls/send/definitions/identifiers', () => ({
  prettifyIdentifier: vi.fn(),
}));

describe('extension/graphView/controls/send/definitions/merge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(normalizeHexColor).mockImplementation((value, fallback) => value || fallback);
    vi.mocked(prettifyIdentifier).mockImplementation((value: string) => `Pretty ${value}`);
  });

  it('merges core, plugin, and inferred node types while normalizing the folder color', () => {
    const graphData = {
      nodes: [
        { id: 'src/app.ts', nodeType: 'service', color: '#123456' },
        { id: 'src/folder', nodeType: undefined, color: '#654321' },
        { id: 'src/ignored', nodeType: 'pluginNode', color: '#abcdef' },
        { id: 'src/defaultColor', nodeType: 'background' },
      ],
      edges: [],
    };

    const definitions = mergeNodeTypes(
      graphData as never,
      [
        {
          id: 'pluginNode',
          label: 'Plugin Node',
          defaultColor: '#999999',
          defaultVisible: false,
        },
      ] as never,
      { folder: '#ABCDEF' },
    );

    expect(normalizeHexColor).toHaveBeenCalled();
    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'folder', defaultColor: '#ABCDEF' }),
        expect.objectContaining({ id: 'pluginNode', label: 'Plugin Node', defaultVisible: false }),
        expect.objectContaining({ id: 'service', label: 'Pretty service', defaultColor: '#123456', defaultVisible: true }),
        expect.objectContaining({ id: 'background', label: 'Pretty background', defaultVisible: true }),
      ]),
    );
    expect(prettifyIdentifier).toHaveBeenCalledWith('service');
    expect(prettifyIdentifier).toHaveBeenCalledWith('background');
  });

  it('merges plugin and inferred edge types while preserving core entries', () => {
    const graphData = {
      nodes: [],
      edges: [
        { id: 'a-b', kind: 'dynamicImport', color: '#112233' },
        { id: 'b-c', kind: 'unstyled' },
        { id: 'c-d', kind: 'pluginEdge', color: '#999999' },
      ],
    };

    const definitions = mergeEdgeTypes(
      graphData as never,
      [
        {
          id: 'pluginEdge',
          label: 'Plugin Edge',
          defaultColor: '#445566',
          defaultVisible: false,
        },
      ] as never,
    );

    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'pluginEdge', label: 'Plugin Edge', defaultColor: '#445566', defaultVisible: false }),
        expect.objectContaining({ id: 'dynamicImport', label: 'Pretty dynamicImport', defaultColor: '#112233', defaultVisible: true }),
        expect.objectContaining({ id: 'unstyled', label: 'Pretty unstyled', defaultColor: '#94A3B8', defaultVisible: true }),
      ]),
    );
    expect(prettifyIdentifier).toHaveBeenCalledWith('dynamicImport');
    expect(prettifyIdentifier).toHaveBeenCalledWith('unstyled');
  });
});
