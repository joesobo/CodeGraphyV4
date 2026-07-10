import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import config from './vitest.config';

describe('performance Vitest source resolution', () => {
  it('resolves workspace packages from source in a clean checkout', () => {
    expect(config.resolve?.alias).toMatchObject({
      '@codegraphy-dev/core': resolve(__dirname, '../packages/core/src/index.ts'),
      '@codegraphy-dev/plugin-api': resolve(
        __dirname,
        '../packages/plugin-api/src/index.ts',
      ),
      '@codegraphy-dev/plugin-markdown': resolve(
        __dirname,
        '../packages/plugin-markdown/src/plugin.ts',
      ),
    });
  });
});
