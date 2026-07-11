import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('plugin getting started guide', () => {
  it('keeps the runnable path to five numbered steps', () => {
    const guide = fs.readFileSync(
      path.resolve(process.cwd(), '../../docs/plugins/GETTING_STARTED.md'),
      'utf8',
    );
    expect(guide.match(/^## \d+\./gm)).toHaveLength(5);
  });
});
