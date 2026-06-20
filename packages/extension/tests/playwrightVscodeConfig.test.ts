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
});

function readPlaywrightMatrixSlices(): PlaywrightMatrixSlice[] {
  const workflowPath = path.resolve(__dirname, '../../../.github/workflows/ci.yml');
  const workflow = fs.readFileSync(workflowPath, 'utf8');

  return [...workflow.matchAll(
    /- label: (.+)\n\s+suite: (.+)\n\s+timeout-minutes: \d+\n\s+grep: '(.+)'/g,
  )].map(([, label, suite, grep]) => ({
    label: label.trim(),
    suite: suite.trim(),
    grep,
  }));
}

function readGeneratedAcceptanceTitles(): string[] {
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
