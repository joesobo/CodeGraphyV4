import * as path from 'path';
import * as vscode from 'vscode';
import type { ExportRequest } from '../../../../plugin-api/src/api';
import { saveExportBuffer, toErrorMessage } from './fileSave';

const DEFAULT_FILTER_LABEL = 'All Files';

function buildDefaultFilters(filename: string): Record<string, string[]> {
  const extension = path.extname(filename);
  if (!extension) {
    return { [DEFAULT_FILTER_LABEL]: ['*'] };
  }

  const normalizedExtension = extension.slice(1);
  return { [`${normalizedExtension.toUpperCase()} Files`]: [normalizedExtension] };
}

export async function savePluginExport(request: ExportRequest): Promise<void> {
  try {
    const buffer = Buffer.from(request.content);

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
