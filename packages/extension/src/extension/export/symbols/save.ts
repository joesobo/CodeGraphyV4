import * as vscode from 'vscode';
import { saveExportBuffer, toErrorMessage } from '../fileSave';

export async function saveExportedSymbolsJson(jsonContent: string, filename?: string): Promise<void> {
  try {
    const defaultFilename = filename ?? `codegraphy-symbols-${Date.now()}.json`;
    const buffer = Buffer.from(jsonContent, 'utf-8');

    await saveExportBuffer(buffer, {
      defaultFilename,
      filters: { 'JSON Files': ['json'] },
      title: 'Export Symbols as JSON',
      successMessage: 'Graph symbols exported',
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to export symbols JSON: ${toErrorMessage(error)}`);
  }
}
