import { describe, expect, it } from 'vitest';
import { createSamplePlugin } from '../src/plugin';

describe('sample plugin', () => {
  it('adds one visible marker node for a sample file', async () => {
    const plugin = createSamplePlugin();
    const result = await plugin.analyzeFile?.('/workspace/demo.sample', '', '/workspace');

    expect(result?.nodes).toEqual([{
      id: 'demo.sample:sample-marker',
      nodeType: 'sample:marker',
      label: 'Hello from Sample Plugin',
      filePath: '/workspace/demo.sample',
      parentId: 'demo.sample',
    }]);
  });
});
