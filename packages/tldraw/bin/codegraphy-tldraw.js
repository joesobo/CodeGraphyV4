#!/usr/bin/env node

import('../dist/index.js')
  .then(async ({ runCli }) => {
    process.exitCode = await runCli(process.argv.slice(2));
  })
  .catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
