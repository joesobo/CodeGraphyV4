const path = require('node:path');
const base = require('@poleski/quality-tools/stryker.config.cjs');

module.exports = {
  ...base,
  vitest: {
    ...base.vitest,
    configFile: path.join(__dirname, 'packages/extension/vitest.config.ts'),
    dir: path.join(__dirname, 'packages/extension'),
  },
};
