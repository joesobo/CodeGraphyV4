import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { createRelationDescriptorProperties } from './descriptorProperties';
import { createRelationEndpointProperties } from './endpointProperties';
import { createRelationIdentityProperties } from './identityProperties';

export function createRelationStatement(
  filePath: string,
  relation: IAnalysisRelation,
  relationIndex: number,
): string {
  return `CREATE (entry:Relation {${[
    ...createRelationIdentityProperties(filePath, relation, relationIndex),
    ...createRelationEndpointProperties(relation),
    ...createRelationDescriptorProperties(relation),
  ].join(', ')}})`;
}
