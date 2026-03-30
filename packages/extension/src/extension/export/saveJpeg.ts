import * as vscode from 'vscode';
import { decodeBase64DataUrl, saveExportBuffer, toErrorMessage } from './fileSave';

export async function saveExportedJpeg(dataUrl: string, filename?: string): Promise<void> {
  try {
    const defaultFilename = filename ?? `codegraphy-${Date.now()}.jpg`;
    const buffer = decodeBase64DataUrl(dataUrl, 'data:image/jpeg;base64,');

    await saveExportBuffer(buffer, {
      defaultFilename,
      filters: { 'JPEG Images': ['jpg', 'jpeg'] },
      title: 'Export Graph as JPEG',
      successMessage: 'Graph exported',
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to export JPEG: ${toErrorMessage(error)}`);
  }
}
