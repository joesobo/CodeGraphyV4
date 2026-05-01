import type { GraphQueryInput, GraphQueryResult } from './model';

export async function requestGraphQuery(input: GraphQueryInput): Promise<GraphQueryResult> {
  return {
    error: 'graph_query_unavailable',
    message: `Core Extension Graph Query transport is not implemented for ${input.report} yet.`,
  };
}
