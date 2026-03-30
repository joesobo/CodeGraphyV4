import * as vscode from 'vscode';
import { decodeBase64DataUrl, saveExportBuffer, toErrorMessage } from './fileSave';

export async function saveExportedPng(dataUrl: string, filename?: string): Promise<void> {
  try {
    const defaultFilename = filename ?? `codegraphy-${Date.now()}.png`;
    const buffer = decodeBase64DataUrl(dataUrl, 'data:image/png;base64,');

    await saveExportBuffer(buffer, {
      defaultFilename,
      filters: { 'PNG Images': ['png'] },
      title: 'Export Graph as PNG',
      successMessage: 'Graph exported',
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to export PNG: ${toErrorMessage(error)}`);
  }
}
