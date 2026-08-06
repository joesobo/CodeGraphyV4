import {
  DEFAULT_DIRECTION_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_NODE_SIZE,
  GRAPH_NODE_BORDER_WIDTH,
  MAX_NODE_SIZE,
  MIN_NODE_SIZE,
  computeConnectionSizes,
} from '@codegraphy-dev/graph-visuals';

/**
 * Keeps the workspace package surface under the extension's NodeNext resolution.
 * The Playwright typecheck imports this file even when the package's own Bundler
 * resolution accepts a source export that NodeNext cannot follow.
 */
export const graphVisualsPackageResolutionProbe = {
  colors: [DEFAULT_DIRECTION_COLOR, DEFAULT_NODE_COLOR],
  connectionSizes: computeConnectionSizes([], []),
  sizes: [MIN_NODE_SIZE, DEFAULT_NODE_SIZE, MAX_NODE_SIZE],
  stroke: GRAPH_NODE_BORDER_WIDTH,
};
