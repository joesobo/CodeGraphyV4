import { describe, expect, it, vi } from 'vitest';
import { reportCrap } from '../../src/crap/report';

describe('report', () => {
  it('prints the success message when there are no violations', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    reportCrap([], 8);
    expect(log).toHaveBeenCalledWith('\n✅ All functions have CRAP score ≤ 8.\n');
    log.mockRestore();
  });

  it('prints the failure summary when violations exist', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    reportCrap([
      {
        complexity: 4,
        coverage: 20,
        crap: 12.5,
        file: 'packages/example/src/file.ts',
        line: 10,
        name: 'fn'
      }
    ], 8);

    expect(log.mock.calls).toEqual([
      ['\n⚠️  CRAP SCORE THRESHOLD EXCEEDED (max: 8)'],
      ['━'.repeat(70)],
      ['Functions with high complexity and low test coverage.\n'],
      [`${'CRAP'.padStart(6)}  ${'Comp'.padStart(4)}  ${'Cov%'.padStart(4)}  Function`],
      [`${'─'.repeat(6)}  ${'─'.repeat(4)}  ${'─'.repeat(4)}  ${'─'.repeat(50)}`],
      ['  12.5     4   20%  fn (packages/example/src/file.ts:10)'],
      [`\n${'━'.repeat(70)}`],
      ['1 function(s) exceed CRAP threshold of 8.'],
      ['Refactor to reduce complexity or add tests to increase coverage.\n']
    ]);
    log.mockRestore();
  });
});
