import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('performance workflow fixture cap', () => {
  it('never schedules the legacy 30k fixture', () => {
    const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/perf.yml'), 'utf8');
    expect(workflow).not.toContain('"fixture":"giant"');
    expect(workflow).toContain('"fixture":"huge"');
  });
});
