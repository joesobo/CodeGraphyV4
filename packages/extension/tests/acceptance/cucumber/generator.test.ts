import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { acceptanceStepExpressions } from '../steps';
import { CUCUMBER_STEPS_PATH, formatCucumberSteps } from './generator';

describe('Cucumber editor step declarations', () => {
  it('are generated from the executable acceptance step registry', () => {
    expect(fs.readFileSync(CUCUMBER_STEPS_PATH, 'utf8')).toBe(formatCucumberSteps(acceptanceStepExpressions));
  });
});
