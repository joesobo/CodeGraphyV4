import * as vscode from 'vscode';
import { saveExportBuffer, toErrorMessage } from './fileSave';

export async function saveExportedJson(jsonContent: string, filename?: string): Promise<void> {
  try {
    const defaultFilename = filename ?? `codegraphy-${Date.now()}.json`;
    const buffer = Buffer.from(jsonContent, 'utf-8');

    await saveExportBuffer(buffer, {
      defaultFilename,
      filters: { 'JSON Files': ['json'] },
      title: 'Export Graph as JSON',
      successMessage: 'Graph JSON exported',
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to export JSON: ${toErrorMessage(error)}`);
  }
}
