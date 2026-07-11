import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Material Icon Theme plugin boundary', () => {
  it('keeps the theme implementation outside extension source', () => {
    const defaultsRoot = path.resolve(
      process.cwd(),
      'src/extension/graphView/groups/defaults',
    );
    expect(fs.existsSync(path.join(defaultsRoot, 'materialTheme'))).toBe(false);

    const source = fs.readFileSync(path.join(defaultsRoot, 'builtIn.ts'), 'utf8');
    expect(source).not.toContain('materialTheme');
    expect(source).not.toContain('plugin-material-icons');
  });
});
