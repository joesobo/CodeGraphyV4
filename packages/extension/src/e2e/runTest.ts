/**
 * VS Code Extension Test Runner
 *
 * Launches a real VS Code instance with the extension loaded and runs the
 * Mocha test suite against it. Tests have access to the full `vscode` API.
 *
 * Run with: npm run test:e2e
 */
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  // The root of the extension (contains package.json)
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');

  // The compiled Mocha suite entry point
  const extensionTestsPath = path.resolve(__dirname, './suite/index');

  // A minimal workspace VS Code opens during the test run
  const workspacePath = path.resolve(__dirname, '../../test-fixtures/workspace');

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [
      workspacePath,
      // Disable other extensions so they don't interfere
      '--disable-extensions',
      // Don't show the welcome tab
      '--skip-welcome',
      '--skip-release-notes',
    ],
  });
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
