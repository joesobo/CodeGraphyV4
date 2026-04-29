import { parseCliCommand } from '../run/parse';
import { runCliCommand } from '../run/command';

const command = parseCliCommand(process.argv.slice(2));
const result = await runCliCommand(command);

if (result.output) {
  process.stdout.write(`${result.output}\n`);
}

process.exitCode = result.exitCode;
