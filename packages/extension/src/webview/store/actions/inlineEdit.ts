import {
  createInlineCreateSession,
  createInlineRenameSession,
  type GraphInlineEditSession,
} from '../../components/graph/inlineEdit/model';
import type { SetState } from './types';

export interface InlineEditActions {
  beginInlineRename(path: string): void;
  beginInlineCreate(kind: 'file' | 'folder', directory: string): void;
  updateInlineEdit(update: Partial<Pick<GraphInlineEditSession, 'value' | 'error' | 'pending'>>): void;
  clearInlineEdit(): void;
}

export function createInlineEditActions(set: SetState): InlineEditActions {
  return {
    beginInlineRename: path => set({ inlineEdit: createInlineRenameSession(path) }),
    beginInlineCreate: (kind, directory) => set({
      inlineEdit: createInlineCreateSession(kind, directory),
    }),
    updateInlineEdit: update => set(state => ({
      inlineEdit: state.inlineEdit ? { ...state.inlineEdit, ...update } : null,
    })),
    clearInlineEdit: () => set({ inlineEdit: null }),
  };
}
