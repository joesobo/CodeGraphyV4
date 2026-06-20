import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolvePlaywrightGrep,
  resolvePlaywrightGrepInvert,
} from '../playwright.vscode.config';

interface PlaywrightMatrixSlice {
  label: string;
  suite: string;
  grep: string;
  artifactSuffix: string;
}

describe('VS Code Playwright config', () => {
  it('matches language slices by feature title even when scenario text does not use the old render phrase', () => {
    const grep = resolvePlaywrightGrep({
      CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE: 'examples',
      CODEGRAPHY_VSCODE_PLAYWRIGHT_GREP: 'Pascal Example|Python Example|Vue Example',
    });

    expect(grep?.test('Pascal Example Pascal example renders file nodes and uses relationships')).toBe(true);
    expect(grep?.test('Python Example Python example renders file nodes and import relationships')).toBe(true);
    expect(grep?.test('Vue Example Vue example renders file nodes and import relationships')).toBe(true);
  });

  it('uses feature titles to classify the full language example suite', () => {
    const grep = resolvePlaywrightGrep({
      CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE: 'examples',
    });

    expect(grep?.test('TypeScript Example TypeScript example renders file and type-import relationships')).toBe(true);
    expect(grep?.test('Graph Scope Edge Types - Vue Imports edge type shows Vue component imports')).toBe(false);
  });

  it('excludes language example features from interaction slices', () => {
    const grepInvert = resolvePlaywrightGrepInvert({
      CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE: 'interactions',
    });

    expect(grepInvert?.test('C++ Example C++ example renders file nodes and include relationships')).toBe(true);
    expect(grepInvert?.test('Graph Scope Edge Types - C++ Include edge type shows C++ include relationships')).toBe(false);
  });

  it('assigns every generated acceptance scenario to exactly one CI Playwright slice', () => {
    const matrix = readPlaywrightMatrixSlices();
    const titles = readGeneratedAcceptanceTitles();

    const unmappedTitles: string[] = [];
    const duplicatedTitles: Array<{ title: string; labels: string[] }> = [];

    for (const title of titles) {
      const labels = matrix
        .filter((slice) => isTitleIncludedInSlice(title, slice))
        .map((slice) => slice.label);

      if (labels.length === 0) {
        unmappedTitles.push(title);
      }

      if (labels.length > 1) {
        duplicatedTitles.push({ title, labels });
      }
    }

    expect(unmappedTitles).toEqual([]);
    expect(duplicatedTitles).toEqual([]);
  });

  it('keeps Turbo cache namespaces unique for each CI Playwright slice', () => {
    const matrix = readPlaywrightMatrixSlices();
    const artifactSuffixes = matrix.map((slice) => slice.artifactSuffix);
    const workflow = readCiWorkflow();

    expect(new Set(artifactSuffixes).size).toBe(matrix.length);
    expect(workflow).toContain(
      'key: ${{ runner.os }}-turbo-playwright-${{ matrix.artifact-suffix }}-${{ steps.playwright-turbo-key.outputs.hash }}-${{ github.run_id }}-${{ github.run_attempt }}',
    );
    expect(workflow).toContain('id: playwright-turbo-cache');
    expect(workflow).toContain('id: playwright-turbo-status');
    expect(workflow).toContain(
      '${{ runner.os }}-turbo-playwright-${{ matrix.artifact-suffix }}-${{ steps.playwright-turbo-key.outputs.hash }}-',
    );
    expect(workflow).toContain(
      '${{ runner.os }}-turbo-playwright-${{ matrix.artifact-suffix }}-',
    );
    expect(workflow).toContain(
      '${{ runner.os }}-turbo-build-',
    );
    expect(workflow).not.toContain(
      'turbo-playwright-${{ matrix.artifact-suffix }}-${{ github.sha }}',
    );
    expect(workflow).not.toContain(
      '            ${{ runner.os }}-turbo-playwright-\n',
    );
  });

  it('pins the CI VS Code host version into the Playwright Turbo hash', () => {
    const workflow = readCiWorkflow();
    const turboConfig = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../../turbo.json'), 'utf8'),
    ) as {
      globalDependencies: string[];
      tasks: { 'test:playwright': { env: string[] } };
    };

    expect(workflow).toContain('CODEGRAPHY_VSCODE_TEST_VERSION: 1.125.1');
    expect(workflow).toContain(
      'key: ${{ runner.os }}-vscode-test-host-${{ env.CODEGRAPHY_VSCODE_TEST_VERSION }}',
    );
    expect(workflow).toContain(
      "if: steps.playwright-turbo-status.outputs.cached != 'true'",
    );
    expect(turboConfig.globalDependencies).toContain('packages/*/src/**/tsconfig*.json');
    expect(turboConfig.globalDependencies).toContain('packages/*/tests/**/tsconfig*.json');
    expect(turboConfig.globalDependencies).not.toContain('packages/**/tsconfig*.json');
    expect(turboConfig.tasks['test:playwright'].env).toContain('CODEGRAPHY_VSCODE_TEST_VERSION');
  });
});

function readPlaywrightMatrixSlices(): PlaywrightMatrixSlice[] {
  const workflow = readCiWorkflow();

  return [...workflow.matchAll(
    /- label: (.+)\n\s+suite: (.+)\n\s+timeout-minutes: \d+\n\s+grep: '(.+)'\n\s+artifact-suffix: (.+)/g,
  )].map(([, label, suite, grep, artifactSuffix]) => ({
    label: label.trim(),
    suite: suite.trim(),
    grep,
    artifactSuffix: artifactSuffix.trim(),
  }));
}

function readCiWorkflow(): string {
  const workflowPath = path.resolve(__dirname, '../../../.github/workflows/ci.yml');
  return fs.readFileSync(workflowPath, 'utf8');
}

function readGeneratedAcceptanceTitles(): string[] {
  ensureAcceptanceArtifactsGenerated();

  const generatedIrRoot = path.resolve(__dirname, 'playwright-vscode/generated-ir');
  return fs.readdirSync(generatedIrRoot)
    .filter((fileName) => fileName.endsWith('.json'))
    .flatMap((fileName) => {
      const ir = JSON.parse(
        fs.readFileSync(path.join(generatedIrRoot, fileName), 'utf8'),
      ) as {
        feature: { name: string };
        scenarios: Array<{
          name: string;
          examples: Array<{ values: Record<string, string> }>;
        }>;
      };

      return ir.scenarios.flatMap((scenario) => {
        const examples = scenario.examples.length > 0
          ? scenario.examples
          : [{ values: {} }];

        return examples.map((example) => {
          const exampleName = formatExampleName(example.values);
          const suffix = exampleName ? ` (${exampleName})` : '';
          return `${ir.feature.name} ${scenario.name}${suffix}`;
        });
      });
    });
}

function ensureAcceptanceArtifactsGenerated(): void {
  execFileSync('pnpm', ['run', 'generate:acceptance'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
  });
}

function isTitleIncludedInSlice(title: string, slice: PlaywrightMatrixSlice): boolean {
  const environment = {
    CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE: slice.suite,
    CODEGRAPHY_VSCODE_PLAYWRIGHT_GREP: slice.grep,
  };

  const grep = resolvePlaywrightGrep(environment);
  const grepInvert = resolvePlaywrightGrepInvert(environment);

  return (grep?.test(title) ?? true) && !(grepInvert?.test(title) ?? false);
}

function formatExampleName(values: Record<string, string>): string {
  const explicitName = values.case ?? values.name ?? values.title ?? values.example;
  if (explicitName) {
    return explicitName;
  }

  return Object.entries(values)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}
