import * as vscode from 'vscode';
import { saveExportBuffer, toErrorMessage } from './fileSave';

export async function saveExportedSvg(svgContent: string, filename?: string): Promise<void> {
  try {
    const defaultFilename = filename ?? `codegraphy-${Date.now()}.svg`;
    const buffer = Buffer.from(svgContent, 'utf-8');

    await saveExportBuffer(buffer, {
      defaultFilename,
      filters: { 'SVG Images': ['svg'] },
      title: 'Export Graph as SVG',
      successMessage: 'Graph exported',
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to export SVG: ${toErrorMessage(error)}`);
  }
}
