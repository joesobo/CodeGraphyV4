import { runCli } from './cli';

process.exitCode = await runCli(process.argv.slice(2));
