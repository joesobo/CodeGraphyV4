import { runCli } from './run';
import { installCliStdoutErrorHandler } from './stdout';

installCliStdoutErrorHandler();
process.exitCode = await runCli(process.argv.slice(2));
