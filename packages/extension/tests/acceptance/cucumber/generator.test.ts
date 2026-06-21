import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { acceptanceStepExpressions } from '../steps';
import { CUCUMBER_STEPS_PATH, formatCucumberSteps } from './generator';

describe('Cucumber editor step declarations', () => {
  it('are generated from the executable acceptance step registry', () => {
    const currentContent = stripStrykerTsNoCheckPrefix(fs.readFileSync(CUCUMBER_STEPS_PATH, 'utf8'));

    expect(currentContent).toBe(formatCucumberSteps(acceptanceStepExpressions));
  });

  it('ignores Stryker mutation instrumentation in generated step declarations', () => {
    const generatedContent = formatCucumberSteps(acceptanceStepExpressions);

    expect(stripStrykerTsNoCheckPrefix(`// @ts-nocheck\n${generatedContent}`)).toBe(generatedContent);
  });
});

function stripStrykerTsNoCheckPrefix(content: string): string {
  return content.replace(/^\/\/ @ts-nocheck\r?\n/, '');
}
