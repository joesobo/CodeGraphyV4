import {
  createPermanentNodeOpenBehavior,
  createTemporaryNodeOpenBehavior,
} from './behavior';
import type {
  EditorOpenBehavior,
  GraphViewProviderTimelineMethodDependencies,
  GraphViewProviderTimelineMethodsSource,
} from './contracts';

export interface GraphViewProviderTimelineEditorMethods {
  _openSelectedNode(nodeId: string): Promise<void>;
  _activateNode(nodeId: string): Promise<void>;
  _openNodeInEditor(nodeId: string, behavior: EditorOpenBehavior): Promise<void>;
  _previewFileAtCommit(
    sha: string,
    filePath: string,
    behavior?: EditorOpenBehavior,
  ): Promise<void>;
}

export function createGraphViewProviderTimelineEditorMethods(
  source: GraphViewProviderTimelineMethodsSource,
  dependencies: GraphViewProviderTimelineMethodDependencies,
): GraphViewProviderTimelineEditorMethods {
  const _previewFileAtCommit = async (
    sha: string,
    filePath: string,
    behavior: EditorOpenBehavior = {
      preview: true,
      preserveFocus: false,
    },
  ): Promise<void> => {
    await dependencies.previewFileAtCommit(
      sha,
      filePath,
      {
        workspaceFolder: dependencies.getWorkspaceFolder(),
        openTextDocument: fileUri => dependencies.openTextDocument(fileUri),
        showTextDocument: (document, nextBehavior) =>
          dependencies.showTextDocument(document, nextBehavior),
        logError: (message, error) => {
          dependencies.logError(message, error);
        },
      },
      behavior,
    );
  };

  const _openNodeInEditor = async (
    nodeId: string,
    behavior: EditorOpenBehavior,
  ): Promise<void> => {
    await dependencies.openNodeInEditor(
      nodeId,
      {
        timelineActive: source._timelineActive,
        currentCommitSha: source._currentCommitSha,
      },
      {
        previewFileAtCommit: (sha, filePath, nextBehavior) =>
          _previewFileAtCommit(sha, filePath, nextBehavior),
        openFile: (filePath, nextBehavior) => source._openFile(filePath, nextBehavior),
      },
      behavior,
    );
  };

  const _openSelectedNode = async (nodeId: string): Promise<void> => {
    await _openNodeInEditor(nodeId, createTemporaryNodeOpenBehavior());
  };

  const _activateNode = async (nodeId: string): Promise<void> => {
    await _openNodeInEditor(nodeId, createPermanentNodeOpenBehavior());
  };

  return {
    _openSelectedNode,
    _activateNode,
    _openNodeInEditor,
    _previewFileAtCommit,
  };
}
