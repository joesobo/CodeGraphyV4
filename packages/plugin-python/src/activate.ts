import * as vscode from 'vscode';
import { createPythonPlugin } from './index';

interface CodeGraphyExports {
  registerPlugin(plugin: unknown, options?: { extensionUri?: vscode.Uri | string }): void;
}

const CODEGRAPHY_EXTENSION_ID = 'codegraphy.codegraphy';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const extension = vscode.extensions.getExtension<CodeGraphyExports>(CODEGRAPHY_EXTENSION_ID);
  if (!extension) return;

  const codeGraphy = extension.isActive ? extension.exports : await extension.activate();
  codeGraphy?.registerPlugin(createPythonPlugin(), {
    extensionUri: context.extensionUri,
  });
}

export function deactivate(): void {}
