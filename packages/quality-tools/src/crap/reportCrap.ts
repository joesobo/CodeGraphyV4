import { type CrapResult } from './analyzeCrap';

export function reportCrap(results: CrapResult[], threshold: number): void {
  if (results.length === 0) {
    console.log(`\n✅ All functions have CRAP score ≤ ${threshold}.\n`);
    return;
  }

  console.log(`\n⚠️  CRAP SCORE THRESHOLD EXCEEDED (max: ${threshold})`);
  console.log('━'.repeat(70));
  console.log('Functions with high complexity and low test coverage.\n');
  console.log(`${'CRAP'.padStart(6)}  ${'Comp'.padStart(4)}  ${'Cov%'.padStart(4)}  Function`);
  console.log(`${'─'.repeat(6)}  ${'─'.repeat(4)}  ${'─'.repeat(4)}  ${'─'.repeat(50)}`);

  for (const result of results) {
    console.log(
      `${result.crap.toFixed(1).padStart(6)}  ${String(result.complexity).padStart(4)}  ${`${result.coverage}%`.padStart(4)}  ${result.name} (${result.file}:${result.line})`
    );
  }

  console.log(`\n${'━'.repeat(70)}`);
  console.log(`${results.length} function(s) exceed CRAP threshold of ${threshold}.`);
  console.log('Refactor to reduce complexity or add tests to increase coverage.\n');
}
