import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import type { CodeGraphyMcpServerDependencies } from './contracts';
import { registerGraphQueryTool } from './graphQueryTool';
import { listQuerySchema, workspacePathSchema } from './schemas';

export function registerGraphQueryTools(
  server: McpServer,
  dependencies: CodeGraphyMcpServerDependencies,
): void {
  registerGraphQueryTool(server, dependencies, 'nodes', 'codegraphy_list_nodes', 'List indexed Relationship Graph nodes for a CodeGraphy Workspace. Defaults to File Nodes; folders and packages are included through Graph Scope.', {
    ...listQuerySchema,
    showOrphans: z.boolean().optional(),
  });

  registerGraphQueryTool(server, dependencies, 'edges', 'codegraphy_list_edges', 'List high-level node connections with grouped Edge Types. Broad calls are paginated.', {
    ...listQuerySchema,
    from: z.string().optional(),
    to: z.string().optional(),
    edgeType: z.string().optional(),
  });

  registerGraphQueryTool(server, dependencies, 'relationships', 'codegraphy_list_relationships', 'List detailed Relationships grouped by node pair and Edge Type. Broad calls can be large and are paginated.', {
    ...listQuerySchema,
    from: z.string().optional(),
    to: z.string().optional(),
    edgeType: z.string().optional(),
  });

  registerGraphQueryTool(server, dependencies, 'symbols', 'codegraphy_list_symbols', 'List symbol declarations or Relationship-backed symbol evidence. Broad calls can be large and are paginated.', {
    ...listQuerySchema,
    filePath: z.string().optional(),
    relatedFrom: z.string().optional(),
    relatedTo: z.string().optional(),
    edgeType: z.string().optional(),
  });

  registerGraphQueryTool(server, dependencies, 'paths', 'codegraphy_find_paths', 'Return bounded directed node paths from one exact node path to another. Paths contain nodes only.', {
    ...workspacePathSchema,
    from: z.string(),
    to: z.string(),
    maxDepth: z.number().int().positive().optional(),
    maxPaths: z.number().int().positive().optional(),
  });
}
