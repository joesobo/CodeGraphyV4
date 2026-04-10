/**
 * Mocha test suite loader.
 * Called by @vscode/test-electron after VS Code starts.
 */
import * as path from 'path';
import { glob } from 'glob';

export async function run(): Promise<void> {
  const { default: Mocha } = await import('mocha');
  const grep = process.env.CODEGRAPHY_E2E_GREP;
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 30_000,
    grep: grep ? new RegExp(grep) : undefined,
  });

  const testsRoot = path.resolve(__dirname, '.');
  const files = await glob('**/*.test.js', { cwd: testsRoot });
  const orderedFiles = [...files].sort((left, right) => {
    const leftPriority = left.endsWith('graph.test.js') ? 0 : 1;
    const rightPriority = right.endsWith('graph.test.js') ? 0 : 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.localeCompare(right);
  });

  for (const file of orderedFiles) {
    mocha.addFile(path.resolve(testsRoot, file));
  }

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) failed`));
      } else {
        resolve();
      }
    });
  });
}
