import { dispatchAgentAction } from './actions';
import { DEFAULT_DEPENDENCIES } from './dependencies';
import {
  readAgentAction,
  readAgentRequest,
  warnUnsupportedAgentAction,
} from './request';
import { guardWorkspaceRequest } from './workspace';
import type {
  CodeGraphyAgentBridgeProvider,
  CodeGraphyAgentUriDependencies,
  CodeGraphyAgentUriLike,
  CodeGraphyAgentUriResult,
} from './types';

export async function handleCodeGraphyAgentUri(
  uri: CodeGraphyAgentUriLike,
  provider: CodeGraphyAgentBridgeProvider,
  dependencies: CodeGraphyAgentUriDependencies = DEFAULT_DEPENDENCIES,
): Promise<CodeGraphyAgentUriResult> {
  const action = readAgentAction(uri.path);
  if (!action) {
    return warnUnsupportedAgentAction(uri.path, dependencies);
  }

  const request = await readAgentRequest(uri, dependencies);
  if (!request) {
    return { status: 'missing-request' };
  }

  const blockedRequest = await guardWorkspaceRequest(request, dependencies);
  if (blockedRequest) {
    return blockedRequest;
  }

  return dispatchAgentAction(action, request, provider, dependencies);
}
