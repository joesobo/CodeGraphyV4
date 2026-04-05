import * as path from 'path';
import * as vscode from 'vscode';
import type { ExportRequest } from '../../../../plugin-api/src/api';
import { saveExportBuffer, toErrorMessage } from './fileSave';

const DEFAULT_FILTER_LABEL = 'All Files';

function buildDefaultFilters(filename: string): Record<string, string[]> {
  const extension = path.extname(filename).replace(/^\./, '');
  if (!extension) {
    return { [DEFAULT_FILTER_LABEL]: ['*'] };
  }

  return { [`${extension.toUpperCase()} Files`]: [extension] };
}

export async function savePluginExport(request: ExportRequest): Promise<void> {
  try {
    const buffer = typeof request.content === 'string'
      ? Buffer.from(request.content, 'utf-8')
      : Buffer.from(request.content);

    await saveExportBuffer(buffer, {
      defaultFilename: request.filename,
      filters: request.filters ?? buildDefaultFilters(request.filename),
      title: request.title ?? `Export ${request.filename}`,
      successMessage: request.successMessage ?? 'Plugin export saved',
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to save plugin export: ${toErrorMessage(error)}`);
  }
}
