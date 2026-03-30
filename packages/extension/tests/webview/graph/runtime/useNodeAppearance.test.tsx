import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/types';
import type { NodeSizeMode } from '../../../../src/shared/settings/modes';
import {
  DEFAULT_NODE_SIZE,
  FAVORITE_BORDER_COLOR,
  getDepthSizeMultiplier,
  type FGNode,
} from '../../../../src/webview/components/graph/model/build';
import {
  applyNodeAppearance,
  useNodeAppearance,
} from '../../../../src/webview/components/graph/runtime/use/directional/nodeAppearance';
import { adjustColorForLightTheme } from '../../../../src/webview/theme/useTheme';

function createData(nodes: IGraphData['nodes']): IGraphData {
    return {
      edges: nodes.length > 1
      ? nodes.slice(1).map((node) => ({ id: `${nodes[0].id}->${node.id}`, from: nodes[0].id, to: node.id }))
      : [],
      nodes,
    };
}

function createGraphNode(id: string, overrides: Partial<FGNode> = {}): FGNode {
  return {
    baseOpacity: 1,
    borderColor: '#000000',
    borderWidth: 0,
    color: '#000000',
    id,
    isFavorite: false,
    label: id,
    size: 0,
    ...overrides,
  } as FGNode;
}

describe('graph/runtime/useNodeAppearance', () => {
  describe('applyNodeAppearance', () => {
    it('applies exact size, color, and border styling for focused, favorite, and regular nodes', () => {
      const graphNodes = [
        createGraphNode('root'),
        createGraphNode('favorite'),
        createGraphNode('regular'),
      ];

      applyNodeAppearance({
        data: createData([
          { color: '#112233', depthLevel: 0, id: 'root', label: 'Root' },
          { color: '#445566', depthLevel: 2, id: 'favorite', label: 'Favorite' },
          { color: '#778899', depthLevel: 1, id: 'regular', label: 'Regular' },
        ]),
        favorites: new Set(['favorite']),
        graphNodes,
        nodeSizeMode: 'uniform',
        theme: 'dark',
      });

      expect(graphNodes[0]).toMatchObject({
        borderColor: '#60a5fa',
        borderWidth: 4,
        color: '#112233',
        isFavorite: false,
        size: DEFAULT_NODE_SIZE * getDepthSizeMultiplier(0),
      });
      expect(graphNodes[1]).toMatchObject({
        borderColor: FAVORITE_BORDER_COLOR,
        borderWidth: 3,
        color: '#445566',
        isFavorite: true,
        size: DEFAULT_NODE_SIZE * getDepthSizeMultiplier(2),
      });
      expect(graphNodes[2]).toMatchObject({
        borderColor: '#778899',
        borderWidth: 2,
        color: '#778899',
        isFavorite: false,
        size: DEFAULT_NODE_SIZE * getDepthSizeMultiplier(1),
      });
    });

    it('adjusts node colors for the light theme and uses the light focused border color', () => {
      const graphNodes = [
        createGraphNode('root'),
        createGraphNode('regular'),
      ];
      const rootColor = '#112233';
      const regularColor = '#445566';

      applyNodeAppearance({
        data: createData([
          { color: rootColor, depthLevel: 0, id: 'root', label: 'Root' },
          { color: regularColor, depthLevel: 1, id: 'regular', label: 'Regular' },
        ]),
        favorites: new Set<string>(),
        graphNodes,
        nodeSizeMode: 'uniform',
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
        nodeSizeMode: 'uniform',
        theme: 'dark',
      })).not.toThrow();

      expect(knownNode).toMatchObject({
        borderColor: '#112233',
        borderWidth: 2,
        color: '#112233',
        isFavorite: false,
        size: DEFAULT_NODE_SIZE * getDepthSizeMultiplier(1),
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
        data: createData([
          { color: '#112233', id: 'root', label: 'Root' },
        ]),
        favorites: new Set<string>(),
        graphNodes,
        nodeSizeMode: 'uniform',
        theme: 'dark',
      });

      expect(graphNodes[0]).toMatchObject({
        borderColor: '#112233',
        borderWidth: 2,
        color: '#112233',
        isFavorite: false,
        size: DEFAULT_NODE_SIZE * getDepthSizeMultiplier(undefined),
      });
    });
  });

  describe('useNodeAppearance', () => {
    it('reapplies appearance when the theme changes on rerender', () => {
      const graphNodes = [createGraphNode('root')];
      const dataRef = {
        current: createData([
          { color: '#112233', depthLevel: 0, id: 'root', label: 'Root' },
        ]),
      };
      const graphDataRef = { current: { links: [], nodes: graphNodes } };
      const favorites = new Set<string>();

      const { rerender } = renderHook(
        (theme: 'dark' | 'light') => useNodeAppearance({
          dataRef,
          favorites,
          graphDataRef,
          nodeSizeMode: 'uniform',
          theme,
        }),
        {
          initialProps: 'dark',
        },
      );

      expect(graphNodes[0]).toMatchObject({
        borderColor: '#60a5fa',
        color: '#112233',
      });

      rerender('light');

      expect(graphNodes[0]).toMatchObject({
        borderColor: '#2563eb',
        color: adjustColorForLightTheme('#112233'),
      });
    });

    it('does not introduce focused borders for nodes without a depth level when node size mode changes', () => {
      const graphNodes = [createGraphNode('root')];
      const dataRef = {
        current: createData([
          { color: '#112233', id: 'root', label: 'Root' },
        ]),
      };
      const graphDataRef = { current: { links: [], nodes: graphNodes } };
      const favorites = new Set<string>();

      const { rerender } = renderHook(
        ({ nodeSizeMode }: { nodeSizeMode: NodeSizeMode }) => useNodeAppearance({
          dataRef,
          favorites,
          graphDataRef,
          nodeSizeMode,
          theme: 'dark',
        }),
        {
          initialProps: { nodeSizeMode: 'uniform' as NodeSizeMode },
        },
      );

      expect(graphNodes[0]).toMatchObject({
        borderColor: '#112233',
        borderWidth: 2,
        size: DEFAULT_NODE_SIZE,
      });

      rerender({ nodeSizeMode: 'connections' as NodeSizeMode });

      expect(graphNodes[0]).toMatchObject({
        borderColor: '#112233',
        borderWidth: 2,
      });
    });
  });
});
