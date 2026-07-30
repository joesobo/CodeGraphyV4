import type {
  CodeGraphyWorkspaceCommand,
  CodeGraphyWorkspaceCommandResponse,
  GraphQueryRequest,
} from '@codegraphy-dev/core';

export type CodeGraphyAgentUriStatus =
  | 'failed'
  | 'indexed'
  | 'missing-request'
  | 'missing-workspace'
  | 'queried'
  | 'status-read'
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
  query?: GraphQueryRequest;
}

export type CodeGraphyAgentGraphQueryRequest = CodeGraphyAgentRequest & {
  query: GraphQueryRequest;
};

export type CodeGraphyAgentAction = 'index' | 'query' | 'status';

export type CodeGraphyAgentResponse =
  | {
    requestId?: string;
    repo: string;
    error: string;
  }
  | {
    requestId?: string;
    repo: string;
    response: CodeGraphyWorkspaceCommandResponse;
  };

export interface CodeGraphyAgentBridgeProvider {
  refresh(): Promise<void>;
}

export interface CodeGraphyAgentUriDependencies {
  executeWorkspaceCommand?(
    command: CodeGraphyWorkspaceCommand,
  ): Promise<CodeGraphyWorkspaceCommandResponse>;
  getWorkspaceRoot(): string | undefined;
  readRequestFile(filePath: string): Promise<CodeGraphyAgentRequest>;
  showErrorMessage(message: string): unknown;
  showWarningMessage(message: string): unknown;
  writeResponseFile(filePath: string, response: CodeGraphyAgentResponse): Promise<void>;
}
