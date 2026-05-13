import * as vscode from 'vscode';
import type { LegendIconImport } from '../../../../shared/protocol/webviewToExtension';

export interface IconImportMessageHandlers {
  workspaceFolder?: { uri: vscode.Uri };
  createDirectory(uri: vscode.Uri): Thenable<void>;
  writeFile(uri: vscode.Uri, content: Uint8Array): Thenable<void>;
}

function isSafeIconImport(iconImport: LegendIconImport): boolean {
  return (
    iconImport.imagePath.startsWith('.codegraphy/icons/')
    && !iconImport.imagePath.includes('..')
    && /\.(svg|png)$/i.test(iconImport.imagePath)
  );
}

export async function writeIconImports(
  iconImports: LegendIconImport[] | undefined,
  handlers: IconImportMessageHandlers,
): Promise<void> {
  if (!iconImports?.length || !handlers.workspaceFolder) {
    return;
  }

  const iconDirectory = vscode.Uri.joinPath(
    handlers.workspaceFolder.uri,
    '.codegraphy',
    'icons',
  );
  await handlers.createDirectory(iconDirectory);

  for (const iconImport of iconImports) {
    if (!isSafeIconImport(iconImport)) {
      continue;
    }

    await handlers.writeFile(
      vscode.Uri.joinPath(handlers.workspaceFolder.uri, iconImport.imagePath),
      Uint8Array.from(Buffer.from(iconImport.contentsBase64, 'base64')),
    );
  }
}
