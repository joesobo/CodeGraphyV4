import { describe, expect, it } from 'vitest';
import type { IAnalysisRelation } from '@codegraphy/plugin-api';
import { hasRelationshipFilters, relationMatchesConfig } from '../../../src/graphQuery/symbols/relationshipFilters';

const relation: IAnalysisRelation = {
  kind: 'reference',
  pluginId: 'plugin.routes',
  sourceId: 'route-reference',
  fromFilePath: 'src/source.ts',
  toFilePath: 'src/target.ts',
};

describe('core/graphQuery/symbols/relationshipFilters', () => {
  it('detects every relationship-backed symbol filter independently', () => {
    expect(hasRelationshipFilters({})).toBe(false);
    expect(hasRelationshipFilters({ relatedFrom: 'src/source.ts' })).toBe(true);
    expect(hasRelationshipFilters({ relatedTo: 'src/target.ts' })).toBe(true);
    expect(hasRelationshipFilters({ edgeType: 'reference' })).toBe(true);
  });

  it('matches relationship endpoints and edge type while treating omitted fields as wildcards', () => {
    expect(relationMatchesConfig(relation, { relatedFrom: 'src/source.ts' })).toBe(true);
    expect(relationMatchesConfig(relation, { relatedTo: 'src/target.ts' })).toBe(true);
    expect(relationMatchesConfig(relation, { edgeType: 'reference' })).toBe(true);
    expect(relationMatchesConfig(relation, {
      relatedFrom: 'src/source.ts',
      relatedTo: 'src/target.ts',
      edgeType: 'reference',
    })).toBe(true);
  });

  it('uses node ids ahead of file paths when relationship endpoints are node-scoped', () => {
    const nodeScopedRelation: IAnalysisRelation = {
      ...relation,
      fromNodeId: 'src/source.ts#run:function',
      toNodeId: 'src/target.ts#Target:type',
    };

    expect(relationMatchesConfig(nodeScopedRelation, {
      relatedFrom: 'src/source.ts#run:function',
      relatedTo: 'src/target.ts#Target:type',
    })).toBe(true);
    expect(relationMatchesConfig(nodeScopedRelation, { relatedFrom: 'src/source.ts' })).toBe(false);
    expect(relationMatchesConfig(nodeScopedRelation, { relatedTo: 'src/target.ts' })).toBe(false);
  });

  it('rejects non-matching relationship endpoint or edge type filters', () => {
    expect(relationMatchesConfig(relation, { relatedFrom: 'src/other.ts' })).toBe(false);
    expect(relationMatchesConfig(relation, { relatedTo: 'src/other.ts' })).toBe(false);
    expect(relationMatchesConfig(relation, { edgeType: 'import' })).toBe(false);
  });
});
