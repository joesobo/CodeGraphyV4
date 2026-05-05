import type {
  CodeGraphyAgentAction,
  CodeGraphyAgentRequest,
  CodeGraphyAgentUriDependencies,
  CodeGraphyAgentUriLike,
  CodeGraphyAgentUriResult,
} from './types';

function readRequestPath(uri: CodeGraphyAgentUriLike): string | undefined {
  return new URLSearchParams(uri.query).get('request') ?? undefined;
}

export function readAgentAction(uriPath: string): CodeGraphyAgentAction | undefined {
  if (uriPath === '/index') {
    return 'index';
  }
  if (uriPath === '/query') {
    return 'query';
  }
  return undefined;
}

export function warnUnsupportedAgentAction(
  uriPath: string,
  dependencies: CodeGraphyAgentUriDependencies,
): CodeGraphyAgentUriResult {
  const displayPath = uriPath.length > 0 ? uriPath : '/';
  dependencies.showWarningMessage(`CodeGraphy ignored unsupported agent request: ${displayPath}.`);
  return { status: 'unsupported-action' };
}

export async function readAgentRequest(
  uri: CodeGraphyAgentUriLike,
  dependencies: CodeGraphyAgentUriDependencies,
): Promise<CodeGraphyAgentRequest | undefined> {
  const requestPath = readRequestPath(uri);
  if (!requestPath) {
    dependencies.showWarningMessage('CodeGraphy agent request did not include a request file.');
    return undefined;
  }

  return dependencies.readRequestFile(requestPath);
}
