import * as vscode from 'vscode';
import type { GraphViewProviderMessageListenerSource } from '../listener';
import {
  canOpenGraphPath,
  normalizeGraphMutationDirectory,
  resolveGraphOpenPath,
} from './pathResolution';
import type { GraphViewProviderPrimaryActions } from './types';

type FileActions = Pick<
  GraphViewProviderPrimaryActions,
  | 'openSelectedNode'
  | 'activateNode'
  | 'canOpenPath'
  | 'setFocusedFile'
  | 'previewFileAtCommit'
  | 'openFile'
  | 'openFileToSide'
  | 'revealInExplorer'
  | 'copyToClipboard'
  | 'deleteFiles'
  | 'renameFile'
  | 'createFile'
  | 'createFolder'
  | 'toggleFavorites'
  | 'addToExclude'
  | 'getFileInfo'
>;

export function createFileActions(source: GraphViewProviderMessageListenerSource): FileActions {
  return {
    openSelectedNode: nodeId => source._openSelectedNode(resolveGraphOpenPath(source, nodeId)),
    activateNode: nodeId => source._activateNode(resolveGraphOpenPath(source, nodeId)),
    canOpenPath: filePath => canOpenGraphPath(source, filePath),
    setFocusedFile: filePath => source.setFocusedFile(filePath),
    previewFileAtCommit: (sha, filePath) => source._previewFileAtCommit(sha, filePath),
    openFile: filePath => source._openFile(resolveGraphOpenPath(source, filePath)),
    openFileToSide: filePath => source._openFile(resolveGraphOpenPath(source, filePath), {
      preserveFocus: false,
      preview: false,
      viewColumn: vscode.ViewColumn.Beside,
    }),
    revealInExplorer: filePath => source._revealInExplorer(resolveGraphOpenPath(source, filePath)),
    copyToClipboard: text => source._copyToClipboard(text),
    deleteFiles: paths => source._deleteFiles(paths),
    renameFile: filePath => source._renameFile(filePath),
    createFile: directory => source._createFile(normalizeGraphMutationDirectory(directory)),
    createFolder: directory => source._createFolder(normalizeGraphMutationDirectory(directory)),
    toggleFavorites: paths => source._toggleFavorites(paths),
    addToExclude: patterns => source._addToExclude(patterns),
    getFileInfo: filePath => source._getFileInfo(resolveGraphOpenPath(source, filePath)),
  };
}
