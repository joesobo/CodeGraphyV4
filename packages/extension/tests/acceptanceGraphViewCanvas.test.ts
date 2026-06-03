import { describe, expect, it } from 'vitest';
import type { Frame } from '@playwright/test';
import { getGraphCounts } from './acceptance/graphView/canvas';

function frameWithBodyText(text: string): Frame {
  return {
    locator: () => ({
      innerText: async () => text,
    }),
  } as unknown as Frame;
}

describe('acceptance graph canvas helpers', () => {
  it('reads graph counts with a singular connection label', async () => {
    await expect(getGraphCounts(frameWithBodyText('5 nodes • 1 connection'))).resolves.toEqual({
      nodes: 5,
      edges: 1,
    });
  });

  it('reads graph counts with a plural connection label', async () => {
    await expect(getGraphCounts(frameWithBodyText('5 nodes • 2 connections'))).resolves.toEqual({
      nodes: 5,
      edges: 2,
    });
  });
});
