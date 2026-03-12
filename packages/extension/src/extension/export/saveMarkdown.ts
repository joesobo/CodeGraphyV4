import * as vscode from 'vscode';
import { saveExportBuffer, toErrorMessage } from './common';

export async function saveExportedMarkdown(markdownContent: string, filename?: string): Promise<void> {
  try {
    const defaultFilename = filename ?? `codegraphy-${Date.now()}.md`;
    const buffer = Buffer.from(markdownContent, 'utf-8');

    await saveExportBuffer(buffer, {
      defaultFilename,
      filters: { 'Markdown Files': ['md'] },
      title: 'Export Graph as Markdown',
      successMessage: 'Graph exported',
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to export Markdown: ${toErrorMessage(error)}`);
  }
}
