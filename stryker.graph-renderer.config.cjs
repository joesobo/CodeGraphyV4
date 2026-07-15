const base = require('./stryker.config.cjs');

module.exports = {
  ...base,
  vitest: {
    ...base.vitest,
    configFile: 'packages/graph-renderer/vitest.config.ts',
    related: false,
  },
};
