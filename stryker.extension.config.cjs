const base = require('@poleski/quality-tools/stryker.config.cjs');

module.exports = {
  ...base,
  vitest: {
    ...base.vitest,
    configFile: 'packages/extension/vitest.config.ts',
  },
};
