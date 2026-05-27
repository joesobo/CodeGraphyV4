import { runCliCommand } from './command';
import { parseCliCommand } from './parse';

const command = parseCliCommand(process.argv.slice(2));
const result = await runCliCommand(command);

if (result.output) {
  process.stdout.write(`${result.output}\n`);
}

process.exitCode = result.exitCode;
