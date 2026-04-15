import type { IAnalysisRelation } from '../../../core/plugins/types/contracts';
import {
  createRelationDescriptorProperties,
  createRelationEndpointProperties,
  createRelationIdentityProperties,
} from './cacheRelationProperties';

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
