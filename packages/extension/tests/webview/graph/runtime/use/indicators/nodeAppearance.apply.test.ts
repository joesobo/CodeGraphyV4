import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NODE_SIZE,
  FAVORITE_BORDER_COLOR,
} from '../../../../../../src/webview/components/graph/model/build';
import { applyNodeAppearance } from '../../../../../../src/webview/components/graph/runtime/use/indicators/nodeAppearance';
import { adjustColorForLightTheme } from '../../../../../../src/webview/theme/useTheme';
import {
  createData,
  createGraphNode,
  DARK_APPEARANCE,
  LIGHT_APPEARANCE,
} from './nodeAppearance.fixture';

describe('applyNodeAppearance', () => {
  it('applies exact size, color, and border styling for focused, favorite, and regular nodes', () => {
    const graphNodes = [
      createGraphNode('root'),
      createGraphNode('favorite'),
      createGraphNode('regular'),
    ];

    applyNodeAppearance({
      appearance: DARK_APPEARANCE,
      data: createData([
        { color: '#112233', depthLevel: 0, id: 'root', label: 'Root' },
        { color: '#445566', depthLevel: 2, id: 'favorite', label: 'Favorite' },
        { color: '#778899', depthLevel: 1, id: 'regular', label: 'Regular' },
      ]),
      favorites: new Set(['favorite']),
      graphNodes,
      theme: 'dark',
    });

    expect(graphNodes[0]).toMatchObject({
      borderColor: '#60a5fa',
      borderWidth: 4,
      color: '#112233',
      isFavorite: false,
      size: DEFAULT_NODE_SIZE,
    });
    expect(graphNodes[1]).toMatchObject({
      borderColor: FAVORITE_BORDER_COLOR,
      borderWidth: 3,
      color: '#445566',
      isFavorite: true,
      size: DEFAULT_NODE_SIZE,
    });
    expect(graphNodes[2]).toMatchObject({
      borderColor: '#778899',
      borderWidth: 2,
      color: '#778899',
      isFavorite: false,
      size: DEFAULT_NODE_SIZE,
    });
  });

  it('adjusts node colors for the light theme and uses the light focused border color', () => {
    const graphNodes = [createGraphNode('root'), createGraphNode('regular')];
    const rootColor = '#112233';
    const regularColor = '#445566';

    applyNodeAppearance({
      appearance: LIGHT_APPEARANCE,
      data: createData([
        { color: rootColor, depthLevel: 0, id: 'root', label: 'Root' },
        { color: regularColor, depthLevel: 1, id: 'regular', label: 'Regular' },
      ]),
      favorites: new Set<string>(),
      graphNodes,
      theme: 'light',
    });

    expect(graphNodes[0]).toMatchObject({
      borderColor: '#2563eb',
      color: adjustColorForLightTheme(rootColor),
    });
    expect(graphNodes[1]).toMatchObject({
      borderColor: adjustColorForLightTheme(regularColor),
      color: adjustColorForLightTheme(regularColor),
    });
  });

  it('leaves graph nodes unchanged when they are not present in the backing graph data', () => {
    const knownNode = createGraphNode('known');
    const missingNode = createGraphNode('missing', {
      borderColor: '#abcdef',
      borderWidth: 7,
      color: '#fedcba',
      isFavorite: true,
      size: 99,
    });

    expect(() => applyNodeAppearance({
      data: createData([
        { color: '#112233', depthLevel: 1, id: 'known', label: 'Known' },
      ]),
      favorites: new Set<string>(),
      graphNodes: [knownNode, missingNode],
      theme: 'dark',
    })).not.toThrow();

    expect(knownNode).toMatchObject({
      borderColor: '#112233',
      borderWidth: 2,
      color: '#112233',
      isFavorite: false,
      size: DEFAULT_NODE_SIZE,
    });
    expect(missingNode).toMatchObject({
      borderColor: '#abcdef',
      borderWidth: 7,
      color: '#fedcba',
      isFavorite: true,
      size: 99,
    });
  });

  it('keeps nodes without a depth level unfocused when applying appearance', () => {
    const graphNodes = [createGraphNode('root')];

    applyNodeAppearance({
      data: createData([{ color: '#112233', id: 'root', label: 'Root' }]),
      favorites: new Set<string>(),
      graphNodes,
      theme: 'dark',
    });

    expect(graphNodes[0]).toMatchObject({
      borderColor: '#112233',
      borderWidth: 2,
      color: '#112233',
      isFavorite: false,
      size: DEFAULT_NODE_SIZE,
    });
  });

  it('dims gitignored file and folder nodes without changing visible size or border width', () => {
    const graphNodes = [
      createGraphNode('generated/output.ts'),
      createGraphNode('generated'),
      createGraphNode('src/app.ts'),
    ];

    applyNodeAppearance({
      data: createData([
        {
          color: '#112233',
          id: 'generated/output.ts',
          label: 'output.ts',
          metadata: { gitIgnored: true, gitIgnoredReason: 'Git ignored' },
        },
        {
          color: '#445566',
          id: 'generated',
          label: 'generated',
          nodeType: 'folder',
          metadata: { gitIgnored: true, gitIgnoredReason: 'Git ignored' },
        },
        { color: '#778899', id: 'src/app.ts', label: 'app.ts' },
      ]),
      favorites: new Set<string>(),
      graphNodes,
      theme: 'dark',
    });

    expect(graphNodes[0]).toMatchObject({
      baseOpacity: 0.45,
      borderColor: '#525c6a',
      color: '#525c6a',
      borderWidth: 2,
      size: DEFAULT_NODE_SIZE,
    });
    expect(graphNodes[1]).toMatchObject({
      baseOpacity: 0.45,
      borderColor: '#606a79',
      color: '#606a79',
      borderWidth: 2,
      size: DEFAULT_NODE_SIZE,
    });
    expect(graphNodes[2]).toMatchObject({
      baseOpacity: 1,
      color: '#778899',
    });
  });
});
