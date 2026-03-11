import { describe, it, expect } from 'vitest';
import { createMarkdownPlugin } from '../src';
import * as path from 'path';
import * as os from 'os';

describe('Markdown plugin ruleId', () => {
  const plugin = createMarkdownPlugin();
  const workspaceRoot = os.tmpdir();

  it('sets wikilink ruleId for wikilinks', async () => {
    await plugin.initialize?.(workspaceRoot);
    const content = `Some text [[Note Name]] more text`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.md'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].ruleId).toBe('wikilink');
  });
});
