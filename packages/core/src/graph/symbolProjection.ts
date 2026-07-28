import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import {
  isDirectSameFileSymbolRelation,
  projectProjectedConnectionsFromFileAnalysis,
} from '../analysis/projection';
import { hasSymbolEndpoint } from './symbolRelations';
import { toRepoRelativeGraphPath } from './symbolPaths';

export function projectFileAnalysisConnections(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
  options: { includeSymbolEndpointRelations?: boolean } = {},
): Map<string, IProjectedConnection[]> {
  const connections = new Map<string, IProjectedConnection[]>();

  for (const [filePath, analysis] of fileAnalysis) {
    const relations = options.includeSymbolEndpointRelations === false
      ? analysis.relations?.filter(relation => (
          !hasSymbolEndpoint(relation) || isDirectSameFileSymbolRelation(relation)
        ))
      : analysis.relations;
    connections.set(
      toRepoRelativeGraphPath(filePath, workspaceRoot),
      projectProjectedConnectionsFromFileAnalysis({ ...analysis, relations }),
    );
  }

  return connections;
}
