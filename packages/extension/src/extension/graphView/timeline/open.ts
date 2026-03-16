import * as vscode from 'vscode';

type GraphViewEditorOpenBehavior = Pick<
  vscode.TextDocumentShowOptions,
  'preview' | 'preserveFocus'
>;

interface GraphViewWorkspaceFolderRef {
  uri: vscode.Uri;
}

export interface GraphViewTimelineOpenState {
  timelineActive: boolean;
  currentCommitSha?: string;
}

export interface GraphViewTimelineOpenHandlers {
  previewFileAtCommit(
    sha: string,
    filePath: string,
    behavior: GraphViewEditorOpenBehavior,
  ): PromiseLike<void>;
  openFile(filePath: string, behavior: GraphViewEditorOpenBehavior): PromiseLike<void>;
}

export interface GraphViewCommitPreviewHandlers {
  workspaceFolder?: GraphViewWorkspaceFolderRef;
  openTextDocument(fileUri: vscode.Uri): PromiseLike<vscode.TextDocument>;
  showTextDocument(
    document: vscode.TextDocument,
    behavior: GraphViewEditorOpenBehavior,
  ): PromiseLike<unknown>;
  logError(label: string, error: unknown): void;
}

export async function openGraphViewNodeInEditor(
  nodeId: string,
  state: GraphViewTimelineOpenState,
  handlers: GraphViewTimelineOpenHandlers,
  behavior: GraphViewEditorOpenBehavior,
): Promise<void> {
  if (state.timelineActive && state.currentCommitSha) {
    await handlers.previewFileAtCommit(state.currentCommitSha, nodeId, behavior);
    return;
  }

  await handlers.openFile(nodeId, behavior);
}

export async function previewGraphViewFileAtCommit(
  sha: string,
  filePath: string,
  handlers: GraphViewCommitPreviewHandlers,
  behavior: GraphViewEditorOpenBehavior = { preview: true, preserveFocus: false },
): Promise<void> {
  if (!handlers.workspaceFolder) return;

  try {
    const absolutePath = vscode.Uri.joinPath(handlers.workspaceFolder.uri, filePath).fsPath;
    const gitUri = vscode.Uri.parse(
      `git:${absolutePath}?${JSON.stringify({ path: absolutePath, ref: sha })}`,
    );
    const document = await handlers.openTextDocument(gitUri);
    await handlers.showTextDocument(document, behavior);
  } catch (error) {
    handlers.logError('[CodeGraphy] Failed to preview file at commit:', error);
  }
}
