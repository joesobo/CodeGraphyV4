import { parseBenchmarkArguments } from './arguments';
import { runGraphBenchmark } from './run';

async function main(): Promise<void> {
  const options = parseBenchmarkArguments(process.argv.slice(2));
  const result = await runGraphBenchmark(options);
  process.stdout.write(`${JSON.stringify({
    outputPath: result.outputPath,
    status: result.report.status,
  })}\n`);
  if (result.report.status !== 'complete') process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
