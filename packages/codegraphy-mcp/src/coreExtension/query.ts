import type { GraphQueryInput, GraphQueryResult } from './model';
import { sendCoreExtensionRequest, type CoreExtensionBridgeResponse } from './bridge';

export interface GraphQueryDependencies {
  sendQueryRequest(input: GraphQueryInput): Promise<CoreExtensionBridgeResponse>;
}

const DEFAULT_DEPENDENCIES: GraphQueryDependencies = {
  sendQueryRequest: (input) => sendCoreExtensionRequest({
    action: 'query',
    repo: input.repo,
    query: {
      report: input.report,
      arguments: input.arguments,
    },
  }),
};

export async function requestGraphQuery(
  input: GraphQueryInput,
  dependencies: GraphQueryDependencies = DEFAULT_DEPENDENCIES,
): Promise<GraphQueryResult> {
  const response = await dependencies.sendQueryRequest(input);

  if (response.status === 'failed') {
    return {
      error: 'graph_query_failed',
      message: response.error,
    };
  }

  if (response.status !== 'ok') {
    return {
      error: 'graph_query_failed',
      message: 'Core Extension did not return a Graph Query result.',
    };
  }

  return response.result;
}
