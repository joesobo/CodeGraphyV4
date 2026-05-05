import type { GraphQueryRequest, GraphQueryResult } from '../../../core/graphQuery';

export type CodeGraphyAgentUriStatus =
  | 'failed'
  | 'indexed'
  | 'missing-request'
  | 'missing-workspace'
  | 'queried'
  | 'unsupported-action'
  | 'wrong-workspace';

export interface CodeGraphyAgentUriResult {
  status: CodeGraphyAgentUriStatus;
}

export interface CodeGraphyAgentUriLike {
  path: string;
  query: string;
}

export interface CodeGraphyAgentRequest {
  repo: string;
  requestId?: string;
  responsePath: string;
}

export interface CodeGraphyAgentGraphQueryRequest extends CodeGraphyAgentRequest {
  query: GraphQueryRequest;
}

export type CodeGraphyAgentAction = 'index' | 'query';

export type CodeGraphyAgentResponse =
  | {
    requestId?: string;
    repo: string;
    status: 'failed';
    error: string;
  }
  | {
    requestId?: string;
    repo: string;
    status: 'indexed';
  }
  | {
    requestId?: string;
    repo: string;
    status: 'ok';
    result: GraphQueryResult;
  };

export interface CodeGraphyAgentBridgeProvider {
  refreshIndex(): Promise<void>;
  queryGraph(request: GraphQueryRequest): GraphQueryResult;
}

export interface CodeGraphyAgentUriDependencies {
  getWorkspaceRoot(): string | undefined;
  readRequestFile(filePath: string): Promise<CodeGraphyAgentRequest>;
  showErrorMessage(message: string): unknown;
  showWarningMessage(message: string): unknown;
  writeResponseFile(filePath: string, response: CodeGraphyAgentResponse): Promise<void>;
}
