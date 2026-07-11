import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { IHandlerContext, PartialState } from '../messageTypes';
import { applyOptimisticFileMutation, type OptimisticFileMutation } from '../optimistic/files';

export function handleFileMutationStarted(
  message: Extract<ExtensionToWebviewMessage, { type: 'FILE_MUTATION_STARTED' }>,
  context: IHandlerContext,
): PartialState {
  const state = context.getState();
  if (!state.graphData) return {};
  const mutation = toOptimisticMutation(message.payload.mutation);
  const result = applyOptimisticFileMutation(state.graphData, mutation);
  return {
    fileMutationError: null,
    graphData: result.graphData,
    pendingFileMutations: {
      ...state.pendingFileMutations,
      [message.payload.mutationId]: result.previousGraphData,
    },
  };
}

export function handleFileMutationFailed(
  message: Extract<ExtensionToWebviewMessage, { type: 'FILE_MUTATION_FAILED' }>,
  context: IHandlerContext,
): PartialState {
  const state = context.getState();
  const previousGraphData = state.pendingFileMutations[message.payload.mutationId];
  if (!previousGraphData) return { fileMutationError: message.payload.message };
  const pendingFileMutations = { ...state.pendingFileMutations };
  delete pendingFileMutations[message.payload.mutationId];
  return {
    fileMutationError: message.payload.message,
    graphData: previousGraphData,
    pendingFileMutations,
  };
}

function toOptimisticMutation(
  mutation: Extract<ExtensionToWebviewMessage, { type: 'FILE_MUTATION_STARTED' }>['payload']['mutation'],
): OptimisticFileMutation {
  return mutation.kind === 'create'
    ? {
        kind: 'create',
        node: {
          id: mutation.filePath,
          label: mutation.filePath.split('/').pop() ?? mutation.filePath,
          color: '#93C5FD',
          nodeType: 'file',
        },
      }
    : mutation;
}
