import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { IHandlerContext, PartialState } from '../messageTypes';
import type { OptimisticFileMutation } from '../optimistic/files';

export function handleFileMutationStarted(
  message: Extract<ExtensionToWebviewMessage, { type: 'FILE_MUTATION_STARTED' }>,
  context: IHandlerContext,
): PartialState {
  const state = context.getState();
  if (!state.graphData) return {};
  const mutation = toOptimisticMutation(message.payload.mutation);
  return {
    fileMutationError: null,
    pendingFileMutations: {
      ...state.pendingFileMutations,
      [message.payload.mutationId]: mutation,
    },
  };
}

export function handleFileMutationFailed(
  message: Extract<ExtensionToWebviewMessage, { type: 'FILE_MUTATION_FAILED' }>,
  context: IHandlerContext,
): PartialState {
  const state = context.getState();
  const pendingMutation = state.pendingFileMutations[message.payload.mutationId];
  if (!pendingMutation) {
    return {
      fileMutationError: state.inlineEdit ? null : message.payload.message,
      inlineEdit: state.inlineEdit
        ? { ...state.inlineEdit, error: message.payload.message, pending: false }
        : null,
    };
  }
  const pendingFileMutations = { ...state.pendingFileMutations };
  delete pendingFileMutations[message.payload.mutationId];
  return {
    fileMutationError: state.inlineEdit ? null : message.payload.message,
    pendingFileMutations,
    inlineEdit: state.inlineEdit
      ? { ...state.inlineEdit, error: message.payload.message, pending: false }
      : null,
  };
}

export function handleInlineFileEditFailed(
  message: Extract<ExtensionToWebviewMessage, { type: 'INLINE_FILE_EDIT_FAILED' }>,
  context: IHandlerContext,
): PartialState {
  const inlineEdit = context.getState().inlineEdit;
  return inlineEdit
    ? { inlineEdit: { ...inlineEdit, error: message.payload.message, pending: false } }
    : {};
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
