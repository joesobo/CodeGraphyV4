/**
 * VS Code Extension Test Runner
 *
 * Launches a real VS Code instance with the extension loaded and runs the
 * Mocha test suite against it. Tests have access to the full `vscode` API.
 *
 * Run with: pnpm run test:e2e
 */
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  // Load the core extension plus the TypeScript plugin so fixture imports
  // produce real graph edges in the extension host.
  const extensionDevelopmentPath = [
    path.resolve(__dirname, '../../'),
    path.resolve(__dirname, '../../packages/plugin-typescript'),
  ];

  // The compiled Mocha suite entry point
  const extensionTestsPath = path.resolve(__dirname, './suite/run');

  // A minimal workspace VS Code opens during the test run
  const workspacePath = path.resolve(__dirname, '../../packages/extension/test-fixtures/workspace');

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
