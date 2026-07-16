import { createRequire } from 'module';
import * as path from 'path';
import type { runTests as runVSCodeTests } from '@vscode/test-electron';

export interface E2eTestRunner {
  extensionTestsPath: string;
  runTests: typeof runVSCodeTests;
}

export function loadE2eTestRunner(repoRoot: string): E2eTestRunner {
  const requireFromExtension = createRequire(
    path.join(repoRoot, 'packages/extension/package.json'),
  );
  const { runTests } = requireFromExtension('@vscode/test-electron') as {
    runTests: typeof runVSCodeTests;
  };
  return {
    extensionTestsPath: path.resolve(
      repoRoot,
      'packages/extension/dist-e2e/extension/src/e2e/suite/run',
    ),
    runTests,
  };
}
