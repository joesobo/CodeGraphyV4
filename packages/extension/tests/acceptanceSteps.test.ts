import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { acceptanceSteps } from './acceptance/steps';

const STEP_PATTERN = /^(Given|When|Then|And|But)\s+(.+)$/;

describe('acceptance step bindings', () => {
  it('binds every human-written acceptance step', () => {
    const missingSteps = readAcceptanceSteps()
      .filter(step => !acceptanceSteps[step.text] && !acceptanceSteps[`${step.keyword} ${step.text}`]);

    expect(missingSteps).toEqual([]);
  });
});

function readAcceptanceSteps(): Array<{ keyword: string; text: string; sourcePath: string; line: number }> {
  const specsRoot = path.resolve(__dirname, 'acceptance/specs');

  return fs.readdirSync(specsRoot)
    .filter(fileName => fileName.endsWith('.feature'))
    .flatMap((fileName) => readSpecSteps(path.join(specsRoot, fileName)));
}

function readSpecSteps(specPath: string): Array<{ keyword: string; text: string; sourcePath: string; line: number }> {
  return fs.readFileSync(specPath, 'utf8')
    .split(/\r?\n/)
    .flatMap((line, index) => {
      const match = STEP_PATTERN.exec(line.trim());
      if (!match) {
        return [];
      }

      return [{
        keyword: match[1],
        text: match[2],
        sourcePath: path.relative(path.resolve(__dirname, '..'), specPath),
        line: index + 1,
      }];
    });
}
