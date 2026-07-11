import { parseObsidianVaultArguments } from './arguments';
import { writeObsidianVault } from './vault';
import { createSyntheticFixture } from '../fixture/presets';

async function main(): Promise<void> {
  const options = parseObsidianVaultArguments(process.argv.slice(2));
  const fixture = createSyntheticFixture(options.fixture, options.seed);
  await writeObsidianVault(fixture, options.outputDirectory);
  process.stdout.write(`${JSON.stringify({
    outputDirectory: options.outputDirectory,
    fixtureHash: fixture.fixtureHash,
    nodeCount: fixture.summary.nodeCount,
    edgeCount: fixture.summary.edgeCount,
  })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
