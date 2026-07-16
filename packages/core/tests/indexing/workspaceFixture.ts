import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { vi } from 'vitest';

export async function createWorkspace(): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-core-index-'));
  await fs.writeFile(path.join(workspaceRoot, 'source.txt'), 'target.txt\n', 'utf-8');
  await fs.writeFile(path.join(workspaceRoot, 'target.txt'), 'done\n', 'utf-8');
  return workspaceRoot;
}

export async function createPackageBackedPluginPackage(
  packageRoot: string,
): Promise<void> {
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@acme/codegraphy-plugin-options',
      version: '1.0.0',
      type: 'module',
      exports: './plugin.js',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^3.0.0',
        defaultOptions: {
          targetFile: 'target.txt',
        },
      },
    }, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
let preAnalyzeTargetFile = '';

export default function createPlugin() {
  return {
    id: 'acme.options',
    name: 'Options Plugin',
    version: '1.0.0',
    apiVersion: '^3.0.0',
    supportedExtensions: ['.txt'],
    sources: [{
      id: 'configured-target',
      name: 'Configured Target',
      description: 'References the target file configured in plugin options.'
    }],
    async onPreAnalyze(_files, _workspaceRoot, context) {
      preAnalyzeTargetFile = typeof context?.options?.targetFile === 'string'
        ? context.options.targetFile
        : '';
    },
    async analyzeFile(filePath, _content, workspaceRoot, context) {
      const targetFile = typeof context?.options?.targetFile === 'string'
        ? context.options.targetFile
        : '';
      if (!filePath.endsWith('source.txt') || targetFile.length === 0 || targetFile !== preAnalyzeTargetFile) {
        return { filePath, relations: [] };
      }

      const targetPath = new URL(targetFile, \`file://\${workspaceRoot}/\`).pathname;
      return {
        filePath,
        relations: [{
          kind: 'reference',
          sourceId: 'configured-target',
          fromFilePath: filePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: targetFile
        }]
      };
    }
  };
}
`,
    'utf-8',
  );
}

export function createTextPlugin(calls: {
  onPreAnalyze: ReturnType<typeof vi.fn>;
  onPostAnalyze: ReturnType<typeof vi.fn>;
  onWorkspaceReady: ReturnType<typeof vi.fn>;
  analyzeFile: ReturnType<typeof vi.fn>;
}): IPlugin {
  return {
    id: 'codegraphy.test-text',
    name: 'Test Text',
    version: '1.0.0',
    apiVersion: '^3.0.0',
    supportedExtensions: ['.txt'],
    sources: [{
      id: 'line-reference',
      name: 'Line Reference',
      description: 'References target files from text lines.',
    }],
    async onPreAnalyze(files, workspaceRoot) {
      calls.onPreAnalyze(files, workspaceRoot);
    },
    onPostAnalyze(graph) {
      calls.onPostAnalyze(graph);
    },
    onWorkspaceReady(graph) {
      calls.onWorkspaceReady(graph);
    },
    async analyzeFile(filePath, content, workspaceRoot) {
      calls.analyzeFile(filePath, content, workspaceRoot);

      if (path.basename(filePath) !== 'source.txt') {
        return { filePath, relations: [] };
      }

      const targetPath = path.join(workspaceRoot, content.trim());
      return {
        filePath,
        relations: [{
          kind: 'import',
          sourceId: 'line-reference',
          fromFilePath: filePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: content.trim(),
        }],
      };
    },
  };
}
