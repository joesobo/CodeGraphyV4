import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import { createRelationDescriptorProperties } from './descriptorProperties';
import { createRelationEndpointProperties } from './endpointProperties';
import { createRelationIdentityProperties } from './identityProperties';

export function createRelationStatement(
  filePath: string,
  relation: IAnalysisRelationshipEvidence,
  relationIndex: number,
  workspaceRoot: string,
): string {
  return `CREATE (entry:Relation {${[
    ...createRelationIdentityProperties(filePath, relation, relationIndex, workspaceRoot),
    ...createRelationEndpointProperties(filePath, relation, workspaceRoot),
    ...createRelationDescriptorProperties(relation, workspaceRoot),
  ].join(', ')}})`;
}
