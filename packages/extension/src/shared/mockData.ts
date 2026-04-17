/**
 * @fileoverview Mock data representing a mini React application.
 * Used for testing and development before real file discovery is implemented.
 *
 * The mock data simulates a typical React project structure with:
 * - Entry point (main.tsx, App.tsx)
 * - Components (Header, Button, Card, Modal, etc.)
 * - Hooks (useAuth, useApi, useLocalStorage)
 * - API layer (client, users, posts)
 * - Utils (helpers, constants)
 * - Styles (global.css, variables.css)
 * - Config files (package.json, tsconfig.json, README.md)
 *
 * @module shared/mockData
 */

import { fileDataToNodes, fileDataToEdges } from './mock/transforms';
import type { IFileData } from './mock/fileData';
import type { IGraphData } from './graph/contracts';
import { MOCK_ENTRY_POINTS } from './mock/entryPoints';
import { MOCK_COMPONENTS } from './mock/components';
import { MOCK_HOOKS, MOCK_API } from './mock/hooksAndApi';
import { MOCK_UTILS, MOCK_STYLES, MOCK_CONFIG } from './mock/utilsAndConfig';

export { fileDataToNodes, fileDataToEdges } from './mock/transforms';

/**
 * Mock file data simulating a React application structure.
 * Contains 21 files with realistic import relationships.
 *
 * @remarks
 * All import paths are verified to exist within the mock data set,
 * ensuring no orphan edges are created.
 */
export const MOCK_FILE_DATA: IFileData[] = [
  ...MOCK_ENTRY_POINTS,
  ...MOCK_COMPONENTS,
  ...MOCK_HOOKS,
  ...MOCK_API,
  ...MOCK_UTILS,
  ...MOCK_STYLES,
  ...MOCK_CONFIG,
];

/**
 * Generates complete mock graph data ready for Vis Network rendering.
 * Combines {@link MOCK_FILE_DATA} into nodes and edges.
 *
 * @returns Complete graph data structure with nodes and edges
 *
 * @example
 * ```typescript
 * const graphData = getMockGraphData();
 * console.log(graphData.nodes.length); // 21 files
 * console.log(graphData.edges.length); // ~25 import relationships
 * ```
 */
export function getMockGraphData(): IGraphData {
  return {
    nodes: fileDataToNodes(MOCK_FILE_DATA),
    edges: fileDataToEdges(MOCK_FILE_DATA),
  };
}
